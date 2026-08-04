import { type Observable } from 'rxjs';
export declare const fetchDataWithTimeout: <T extends Promise<unknown>>(asyncFunc: T, abortCtrl: AbortController, defaultResult?: null, timeoutDuration?: number) => Promise<import("rxjs").ObservedValueOf<T> | null>;
/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export declare function rateLimitingForkJoin<T>(observables: Array<Observable<T>>, maxConcurrentRequests?: number): Observable<T[]>;
