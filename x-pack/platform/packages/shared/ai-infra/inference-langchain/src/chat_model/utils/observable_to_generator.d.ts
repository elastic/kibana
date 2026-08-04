import type { Observable } from 'rxjs';
/**
 * Convert an Observable into an async iterator.
 * (don't ask, langchain is using async iterators for stream mode...)
 */
export declare function toAsyncIterator<T>(observable: Observable<T>): AsyncIterableIterator<T>;
