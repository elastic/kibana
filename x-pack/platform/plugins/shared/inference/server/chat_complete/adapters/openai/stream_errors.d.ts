/**
 * Error line from standard openAI providers
 */
export interface OpenAIErrorLine {
    error: {
        message: string;
    };
}
/**
 * Error line from the Elastic inference API.
 */
export interface ElasticInferenceErrorLine {
    error: {
        type: string;
        reason: string;
        root_cause?: {
            type: string;
            reason: string;
        };
    };
    status?: number;
}
/**
 * Error line not respecting either of those two formats.
 */
export interface UnknownErrorLine {
    error: Record<string, any>;
}
export type ErrorLine = OpenAIErrorLine | ElasticInferenceErrorLine | UnknownErrorLine;
export declare const convertStreamError: ({ error }: ErrorLine) => import("@kbn/inference-common").InferenceTaskProviderError | import("@kbn/inference-common/src/chat_complete/errors").ChatCompletionContextLengthExceededError;
