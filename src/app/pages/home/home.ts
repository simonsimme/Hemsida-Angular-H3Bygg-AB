import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

interface Review {
  author_name: string;
  rating: number;
  review_text: string;
  original_text: string;
  author_photo_url: string;
  publish_time: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [CommonModule]
})
export class Home implements OnInit, OnDestroy {
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;

  // Google Reviews
  reviews: Review[] = [];
  reviewsLoading = true;
  reviewsError = false;

  // Företagsklockan
  years: number = 0;
  months: number = 0;
  days: number = 0;

  private intervalId: any;
  private startDate = new Date(2015, 2, 1); // 1 mars 2015 (månad är 0-indexerad)

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.reviewsLoading = false;
      return;
    }

    this.http.get<Review[]>('/backend/get_reviews.php').pipe(timeout(3000)).subscribe({
        next: (data) => {
          this.reviews = data;
          this.reviewsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          console.error('Failed to fetch reviews from backend, falling back to local JSON.');
          // Fallback: använd lokal JSON
          this.http.get<any>('assets/json/reviews.json').subscribe({
            next: (data) => {
              this.reviews = (data.reviews ?? []).map((r: any) => ({
                author_name: r.authorAttribution?.displayName ?? '',
                rating: r.rating ?? 0,
                review_text: r.text?.text ?? '',
                original_text: r.originalText?.text ?? '',
                author_photo_url: r.authorAttribution?.photoUri ?? '',
                publish_time: r.publishTime ?? ''
              }));
              console.log('Using fallback reviews from local JSON.');
              this.reviewsLoading = false;
              this.cdr.detectChanges();
            },
            error: () => {
              console.error('Failed to load fallback reviews JSON.');
              this.reviewsLoading = false;
              this.reviewsError = true;
              this.cdr.detectChanges();
            }
          });
        }
      });

    this.updateCompanyClock();
    // Uppdatera klockan varje sekund
    this.intervalId = setInterval(() => {
      this.updateCompanyClock();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i < rating ? 1 : 0);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });
  }

  private updateCompanyClock() {
    const now = new Date();
    const diff = now.getTime() - this.startDate.getTime();
    
    // Beräkna total tid i sekunder
    const totalSeconds = Math.floor(diff / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    
    // Beräkna år och månader
    let years = 0;
    let months = 0;
    let tempDate = new Date(this.startDate);
    
    while (tempDate < now) {
      const nextYear = new Date(tempDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      if (nextYear <= now) {
        years++;
        tempDate = nextYear;
      } else {
        break;
      }
    }
    
    while (tempDate < now) {
      const nextMonth = new Date(tempDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      if (nextMonth <= now) {
        months++;
        tempDate = nextMonth;
      } else {
        break;
      }
    }
    
    // Beräkna återstående dagar, timmar, minuter och sekunder
    const remainingTime = now.getTime() - tempDate.getTime();
    const remainingSeconds = Math.floor(remainingTime / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingDays = Math.floor(remainingHours / 24);
    
    this.years = years;
    this.months = months;
    this.days = remainingDays;
  }
}