import type { OperatorFunction } from 'rxjs';
export declare function untilAborted<T>(signal: AbortSignal): OperatorFunction<T, T>;
