import { type UnvalidatedToolCall } from '@kbn/inference-common';
import type { ChatCompletionTokenLimitReachedError, ChatCompletionToolNotFoundError, ChatCompletionToolValidationError, ChatCompletionContextLengthExceededError } from '@kbn/inference-common/src/chat_complete/errors';
export declare function createContextLengthExceededError({ message, }: {
    message?: string;
}): ChatCompletionContextLengthExceededError;
export declare function createTokenLimitReachedError(tokenLimit?: number, tokenCount?: number): ChatCompletionTokenLimitReachedError;
export declare function createToolNotFoundError({ name, args, }: {
    name: string;
    args: string;
}): ChatCompletionToolNotFoundError;
export declare function createToolValidationError(message: string, meta: {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls: UnvalidatedToolCall[];
}): ChatCompletionToolValidationError;
