import type { OperatorFunction } from 'rxjs';
import type { ChatEvent, MessageAddEvent } from '../conversation_complete';
import type { ConcatenatedMessage } from './concatenate_chat_completion_chunks';
type ConcatenateMessageCallback = (concatenatedMessage: ConcatenatedMessage) => Promise<ConcatenatedMessage>;
export declare function emitWithConcatenatedMessage<T extends ChatEvent>(callback?: ConcatenateMessageCallback): OperatorFunction<T, T | MessageAddEvent>;
export {};
