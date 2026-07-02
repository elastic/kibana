import { type Observable } from 'rxjs';
import type { ChatEvent } from '../conversation_complete';
import { MessageRole } from '../types';
export interface ConcatenatedMessage {
    message: {
        content: string;
        role: MessageRole;
        function_call: {
            name: string;
            arguments: string;
            trigger: MessageRole.Assistant | MessageRole.User;
        };
    };
}
export declare const concatenateChatCompletionChunks: () => (source: Observable<ChatEvent>) => Observable<ConcatenatedMessage>;
