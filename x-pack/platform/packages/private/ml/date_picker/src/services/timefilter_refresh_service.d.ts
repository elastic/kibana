import { Subject } from 'rxjs';
/**
 * State definition of `mlTimefilterRefresh$` observable.
 */
export interface Refresh {
    /**
     * Timestamp of the last time a refresh got triggered.
     */
    lastRefresh: number;
    /**
     * The time range triggered by the refresh.
     */
    timeRange?: {
        start: string;
        end: string;
    };
}
/**
 * Observable to hold `Refresh` state.
 */
export declare const mlTimefilterRefresh$: Subject<Refresh>;
