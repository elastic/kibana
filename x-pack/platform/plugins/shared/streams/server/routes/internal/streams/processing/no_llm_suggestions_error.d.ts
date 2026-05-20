/**
 * Error thrown when the LLM does not provide tool calls in its response.
 * This indicates that suggestions could not be generated, but is not
 * necessarily an error condition - it should be handled gracefully by
 * showing "no suggestions found" to the user.
 */
export declare class NoLLMSuggestionsError extends Error {
    constructor(message?: string);
}
export declare function isNoLLMSuggestionsError(error: unknown): error is NoLLMSuggestionsError;
