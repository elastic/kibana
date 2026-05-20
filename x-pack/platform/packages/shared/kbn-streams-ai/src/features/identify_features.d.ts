import type { Logger } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { type BaseFeature, type IgnoredFeature } from '@kbn/streams-schema';
export interface PreviouslyIdentifiedFeature {
    id: string;
    type: string;
    subtype?: string;
    title?: string;
    description?: string;
    properties: Record<string, unknown>;
}
export declare const toPreviouslyIdentifiedFeature: (feature: BaseFeature) => PreviouslyIdentifiedFeature;
export type { IgnoredFeature } from '@kbn/streams-schema';
export interface ExcludedFeatureSummary {
    id: string;
    type: string;
    subtype?: string;
    title?: string;
    description?: string;
    properties: Record<string, unknown>;
}
export interface IdentifyFeaturesOptions {
    streamName: string;
    sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
    excludedFeatures?: ExcludedFeatureSummary[];
    inferenceClient: BoundInferenceClient;
    systemPrompt: string;
    logger: Logger;
    signal: AbortSignal;
    previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
}
export declare function identifyFeatures({ streamName, sampleDocuments, excludedFeatures, systemPrompt, inferenceClient, signal, previouslyIdentifiedFeatures, }: IdentifyFeaturesOptions): Promise<{
    features: BaseFeature[];
    ignoredFeatures: IgnoredFeature[];
    tokensUsed: ChatCompletionTokenCount;
}>;
