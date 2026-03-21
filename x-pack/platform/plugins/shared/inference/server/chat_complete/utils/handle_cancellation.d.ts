import type { OperatorFunction } from 'rxjs';
export declare function handleCancellation<T>(abortSignal: AbortSignal): OperatorFunction<T, T>;
