import type { ElasticsearchClient } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import type { StreamType } from '@kbn/streams-schema';
import { type Feature, type IterationResult } from '@kbn/streams-schema';
import type { FeatureClient } from '../../streams/feature/feature_client';
import type { SigEventsTuningConfig } from '../../../../common/sig_events_tuning_config';
type IterationTuningParams = Partial<Pick<SigEventsTuningConfig, 'sample_size' | 'feature_ttl_days' | 'entity_filtered_ratio' | 'diverse_ratio' | 'max_excluded_features_in_prompt' | 'max_entity_filters'>> & {
    maxPreviouslyIdentifiedFeatures?: number;
};
export interface FeaturesIdentifiedTelemetry {
    run_id: string;
    iteration: number;
    stream_name: string;
    stream_type: StreamType;
    docs_count: number;
    excluded_features_count: number;
    total_filters: number;
    filters_capped: boolean;
    has_filtered_documents: boolean;
    duration_ms: number;
    state: 'success' | 'failure' | 'canceled';
    features_new: number;
    features_updated: number;
    input_tokens_used: number;
    output_tokens_used: number;
    total_tokens_used: number;
    cached_tokens_used: number;
    llm_ignored_count: number;
    code_ignored_count: number;
}
export interface TelemetryContext {
    run_id: string;
    iteration: number;
    stream_name: string;
    stream_type: StreamType;
    docs_count: number;
    excluded_features_count: number;
    total_filters: number;
    filters_capped: boolean;
    has_filtered_documents: boolean;
}
export declare function buildTelemetry(ctx: TelemetryContext, durationMs: number, outcome: {
    state: 'failure' | 'canceled';
} | {
    state: 'success';
    tokensUsed: ChatCompletionTokenCount;
    newCount: number;
    updatedCount: number;
    llmIgnoredCount: number;
    codeIgnoredCount: number;
}): FeaturesIdentifiedTelemetry;
export interface IdentifyInferredFeaturesOptions {
    esClient: ElasticsearchClient;
    featureClient: FeatureClient;
    soClient: SavedObjectsClientContract;
    inferenceClient: BoundInferenceClient;
    logger: Logger;
    signal: AbortSignal;
    streamName: string;
    streamType: StreamType;
    start: number;
    end: number;
    runId: string;
    iteration?: number;
    tuning?: IterationTuningParams;
    diverseOffset?: number;
    trackFeaturesIdentified?: (data: FeaturesIdentifiedTelemetry) => void;
}
export interface IdentifyInferredFeaturesResult {
    hasDocuments: boolean;
    docsCount: number;
    docIds: string[];
    discoveredFeatures: Feature[];
    iterationResult: IterationResult;
    nextDiverseOffset: number;
}
export declare function identifyInferredFeatures({ esClient, featureClient, soClient, inferenceClient, logger, signal, streamName, streamType, start, end, runId, iteration, tuning, diverseOffset, trackFeaturesIdentified, }: IdentifyInferredFeaturesOptions): Promise<IdentifyInferredFeaturesResult>;
export {};
