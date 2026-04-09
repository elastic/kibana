/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchKnowledgeIndicators } from '@kbn/streams-ai';
import type {
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsOutput,
} from '@kbn/streams-ai';
import type { Logger } from '@kbn/core/server';
import type { FeatureClient } from '../../../lib/streams/feature/feature_client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../../../lib/streams/client';

export async function searchKnowledgeIndicatorsToolHandler({
  streamsClient,
  featureClient,
  queryClient,
  logger,
  params,
}: {
  streamsClient: StreamsClient;
  featureClient: FeatureClient;
  queryClient: QueryClient;
  logger: Logger;
  params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput> {
  return await searchKnowledgeIndicators({
    params,
    onFeatureFetchError: (streamName, error) => {
      const errorMessage =
        error instanceof Error ? error.stack ?? error.message : String(error ?? 'Unknown error');
      logger.debug(`search_kis: failed to fetch features for ${streamName}: ${errorMessage}`);
    },
    getStreamNames: async () => {
      const streams = await streamsClient.listStreams();
      return streams.map((stream) => stream.name);
    },
    getFeatures: async (streamName, { searchText, limit }) => {
      const result = searchText
        ? await featureClient.findFeatures(streamName, searchText, { limit })
        : await featureClient.getFeatures(streamName, { limit });
      return result.hits;
    },
    getQueries: async (streamNames, search_text) => {
      // findQueries uses the default search mode (hybrid when ELSER is available,
      // keyword otherwise), giving the agent the best-available ranking.
      const links = search_text
        ? await queryClient.findQueries(streamNames, search_text)
        : await queryClient.getQueryLinks(streamNames);

      return links;
    },
  });
}
