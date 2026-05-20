import type { ElasticsearchClient, IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceClient } from '@kbn/inference-common';
import { type SignificantEventsQueriesGenerationResult } from '@kbn/streams-schema';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { StreamsClient } from '../streams/client';
import type { FeatureClient } from '../streams/feature/feature_client';
import type { QueryClient } from '../streams/assets/query/query_client';
import type { EbtTelemetryClient } from '../telemetry';
export interface GenerateKIQueriesParams {
    streamName: string;
    connectorId?: string;
    maxExistingQueriesForContext?: number;
}
export interface GenerateKIQueriesDependencies {
    streamsClient: StreamsClient;
    inferenceClient: InferenceClient;
    soClient: SavedObjectsClientContract;
    featureClient: FeatureClient;
    queryClient: QueryClient;
    esClient: ElasticsearchClient;
    uiSettingsClient: IUiSettingsClient;
    searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
    request: KibanaRequest;
    logger: Logger;
    signal: AbortSignal;
    telemetry: EbtTelemetryClient;
}
export declare function generateKIQueries(params: GenerateKIQueriesParams, deps: GenerateKIQueriesDependencies): Promise<SignificantEventsQueriesGenerationResult & {
    toolUsage: SignificantEventsToolUsage;
    connectorId: string;
}>;
