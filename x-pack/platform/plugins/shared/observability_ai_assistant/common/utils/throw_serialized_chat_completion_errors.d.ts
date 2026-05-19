import type { OperatorFunction } from 'rxjs';
import type { BufferFlushEvent } from '../conversation_complete';
import { type StreamingChatResponseEvent, type ChatCompletionErrorEvent } from '../conversation_complete';
export declare function throwSerializedChatCompletionErrors<T extends StreamingChatResponseEvent | BufferFlushEvent>(): OperatorFunction<T, Exclude<T, ChatCompletionErrorEvent>>;
