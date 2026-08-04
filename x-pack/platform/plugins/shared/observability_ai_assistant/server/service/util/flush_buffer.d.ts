import type { OperatorFunction } from 'rxjs';
import type { BufferFlushEvent, StreamingChatResponseEventWithoutError } from '../../../common/conversation_complete';
export declare function flushBuffer<T extends StreamingChatResponseEventWithoutError>(isCloud: boolean): OperatorFunction<T, T | BufferFlushEvent>;
