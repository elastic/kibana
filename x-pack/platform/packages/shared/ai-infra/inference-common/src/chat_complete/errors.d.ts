import { InferenceTaskError } from '../errors';
import type { UnvalidatedToolCall } from './tools';
/**
 * List of code of error that are specific to the {@link ChatCompleteAPI}
 */
export declare enum ChatCompletionErrorCode {
    ContextLengthExceededError = "contextLengthExceededError",
    OutputTokenLimitReachedError = "outputTokenLimitReachedError",
    ToolNotFoundError = "toolNotFoundError",
    ToolValidationError = "toolValidationError"
}
/**
 * Error thrown if the completion call fails because of a context length error,
 * e.g. when too many input token or tool definitions are sent.
 */
export type ChatCompletionContextLengthExceededError = InferenceTaskError<ChatCompletionErrorCode.ContextLengthExceededError, {}>;
/**
 * Error thrown if the completion call fails because of an output token limit error
 */
export type ChatCompletionTokenLimitReachedError = InferenceTaskError<ChatCompletionErrorCode.OutputTokenLimitReachedError, {
    tokenLimit?: number;
    tokenCount?: number;
}>;
/**
 * Error thrown if the LLM called a tool that was not provided
 * in the list of available tools.
 */
export type ChatCompletionToolNotFoundError = InferenceTaskError<ChatCompletionErrorCode.ToolNotFoundError, {
    /** The name of the tool that got called */
    name: string;
    /** (unparsed) arguments the tool was called with*/
    arguments: string;
}>;
/**
 * Error thrown when the LLM called a tool with parameters that
 * don't match the tool's schema.
 *
 * The level of details on the error vary depending on the underlying LLM.
 */
export type ChatCompletionToolValidationError = InferenceTaskError<ChatCompletionErrorCode.ToolValidationError, {
    name?: string;
    arguments?: string;
    errorsText?: string;
    toolCalls?: UnvalidatedToolCall[];
    content?: string;
}>;
/**
 * Check if an error is a {@link ChatCompletionContextLengthExceededError}
 */
export declare function isContextLengthExceededError(error: Error): error is ChatCompletionContextLengthExceededError;
/**
 * Check if an error is a {@link ChatCompletionToolValidationError}
 */
export declare function isToolValidationError(error?: Error): error is ChatCompletionToolValidationError;
/**
 * Check if an error is a {@link ChatCompletionTokenLimitReachedError}
 */
export declare function isOutputTokenLimitReachedError(error: Error): error is ChatCompletionTokenLimitReachedError;
/**
 * Check if an error is a {@link ChatCompletionToolNotFoundError}
 */
export declare function isToolNotFoundError(error: Error): error is ChatCompletionToolNotFoundError;
