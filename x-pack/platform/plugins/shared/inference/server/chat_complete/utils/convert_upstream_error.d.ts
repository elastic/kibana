import type { InferenceTaskProviderError } from '@kbn/inference-common';
import type { ChatCompletionContextLengthExceededError } from '@kbn/inference-common/src/chat_complete/errors';
export declare const convertUpstreamError: (source: string | Error, { statusCode, messagePrefix }?: {
    statusCode?: number;
    messagePrefix?: string;
}) => InferenceTaskProviderError | ChatCompletionContextLengthExceededError;
export declare const isTooManyTokensError: (message: string) => boolean;
