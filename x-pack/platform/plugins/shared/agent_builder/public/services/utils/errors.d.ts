import type { MonoTypeOperatorFunction } from 'rxjs';
/**
 * Convert SSE errors to AgentBuilder errors and rethrow them.
 */
export declare function unwrapAgentBuilderErrors<T>(): MonoTypeOperatorFunction<T>;
