import type { OperatorFunction } from 'rxjs';
import type { InferenceTaskEvent } from '../inference_task';
import type { ChatCompletionEvent, ChatCompletionChunkEvent, ChatCompletionMessageEvent, ChatCompletionTokenCountEvent } from './events';
import type { ToolOptions } from './tools';
/**
 * Check if the provided {@link ChatCompletionEvent} is a {@link ChatCompletionChunkEvent}
 */
export declare function isChatCompletionChunkEvent(event: ChatCompletionEvent): event is ChatCompletionChunkEvent;
/**
 * Check if the provided {@link ChatCompletionEvent} is a {@link ChatCompletionMessageEvent}
 */
export declare function isChatCompletionMessageEvent<T extends ToolOptions>(event: ChatCompletionEvent<T>): event is ChatCompletionMessageEvent<T>;
/**
 * Check if the provided {@link ChatCompletionEvent} is a {@link ChatCompletionMessageEvent}
 */
export declare function isChatCompletionTokenCountEvent(event: ChatCompletionEvent): event is ChatCompletionTokenCountEvent;
/**
 * Check if the provided {@link InferenceTaskEvent} is a {@link ChatCompletionEvent}
 */
export declare function isChatCompletionEvent(event: InferenceTaskEvent): event is ChatCompletionEvent;
/**
 * Operator filtering out the chunk events from the provided observable.
 */
export declare function withoutChunkEvents<T extends ChatCompletionEvent>(): OperatorFunction<T, Exclude<T, ChatCompletionChunkEvent>>;
/**
 * Operator filtering out the token count events from the provided observable.
 */
export declare function withoutTokenCountEvents<T extends ChatCompletionEvent>(): OperatorFunction<T, Exclude<T, ChatCompletionTokenCountEvent>>;
