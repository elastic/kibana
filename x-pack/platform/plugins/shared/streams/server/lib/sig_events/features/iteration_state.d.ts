import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { Feature, IterationResult } from '@kbn/streams-schema';
export declare const MS_PER_DAY: number;
export interface AccumulatedIterationState {
    discoveredFeatures: Feature[];
    iterationResults: IterationResult[];
}
export declare function createEmptyAccumulatedState(): AccumulatedIterationState;
export declare function deriveSuccessCount(results: IterationResult[]): number;
export declare function deriveTotalTokensUsed(results: IterationResult[]): ChatCompletionTokenCount;
