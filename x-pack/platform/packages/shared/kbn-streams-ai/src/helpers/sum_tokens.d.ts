import type { ChatCompletionTokenCount } from '@kbn/inference-common';
export declare const EMPTY_TOKENS: ChatCompletionTokenCount;
export declare function sumTokens({ accumulated, added, }: {
    accumulated?: ChatCompletionTokenCount;
    added?: ChatCompletionTokenCount;
}): ChatCompletionTokenCount;
