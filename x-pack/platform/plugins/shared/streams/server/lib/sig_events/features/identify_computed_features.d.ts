import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Feature, Streams } from '@kbn/streams-schema';
import type { FeatureClient } from '../../streams/feature/feature_client';
export interface IdentifyComputedFeaturesOptions {
    stream: Streams.all.Definition;
    streamName: string;
    start: number;
    end: number;
    esClient: ElasticsearchClient;
    featureClient: FeatureClient;
    logger: Logger;
    featureTtlDays?: number;
    runId: string;
}
export declare function identifyComputedFeatures({ stream, streamName, start, end, esClient, featureClient, logger, featureTtlDays, runId, }: IdentifyComputedFeaturesOptions): Promise<Feature[]>;
