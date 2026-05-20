import type { SearchKnowledgeIndicatorsInput, SearchKnowledgeIndicatorsOutput } from '@kbn/streams-ai';
import type { Logger } from '@kbn/core/server';
import type { FeatureClient } from '../../../lib/streams/feature/feature_client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../../../lib/streams/client';
export declare function searchKnowledgeIndicatorsToolHandler({ streamsClient, featureClient, queryClient, logger, params, }: {
    streamsClient: StreamsClient;
    featureClient: FeatureClient;
    queryClient: QueryClient;
    logger: Logger;
    params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput>;
