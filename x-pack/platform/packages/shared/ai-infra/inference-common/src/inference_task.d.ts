import type { ServerSentEventBase } from '@kbn/sse-utils';
/**
 * Base interface for all inference events.
 */
export type InferenceTaskEventBase<TEventType extends string, TData extends Record<string, any>> = ServerSentEventBase<TEventType, TData>;
export declare enum InferenceTaskEventType {
    error = "error"
}
export type InferenceTaskEvent = InferenceTaskEventBase<string, Record<string, unknown>>;
