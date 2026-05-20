import type { MessageAddEvent } from '../conversation_complete';
export declare function createFunctionRequestMessage({ name, args, }: {
    name: string;
    args?: Record<string, any>;
}): MessageAddEvent;
