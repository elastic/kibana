import type { BaseFeature } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import type { FeatureClient } from '../../../lib/streams/feature/feature_client';
export declare function createFeatureKnowledgeIndicatorToolHandler({ featureClient, streamName, featureInput, logger, }: {
    featureClient: FeatureClient;
    streamName: string;
    featureInput: Omit<BaseFeature, 'stream_name'>;
    logger: Logger;
}): Promise<{
    id: string;
    uuid: string;
}>;
