import { type MessageAddEvent } from '../conversation_complete';
export declare function createFunctionResponseMessage({ name, content, data, }: {
    name: string;
    content: unknown;
    data?: unknown;
}): MessageAddEvent;
