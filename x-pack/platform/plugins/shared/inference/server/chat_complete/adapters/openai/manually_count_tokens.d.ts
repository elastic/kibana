import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import type { OpenAIRequest } from './types';
export declare const manuallyCountPromptTokens: (request: OpenAIRequest) => number;
export declare const manuallyCountCompletionTokens: (chunks: ChatCompletionChunkEvent[]) => number;
