import { type Observable } from 'rxjs';
/**
 * Provides an observable based on the input
 * preserving the reference.
 *
 * @param value
 */
export declare function useAsObservable<T>(value: T): Observable<T>;
