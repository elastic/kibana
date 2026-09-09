/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import {
  INFERRED_FEATURE_TYPES,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
} from '@kbn/significant-events-schema';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { searchFeatureSimilarity } from '../../../lib/significant_events/features/feature_similarity_search';
import { createSignificantEventsAvailability } from '../significant_events_availability';

export const SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID =
  platformSignificantEventsTools.searchSimilarFeatures;

const featureSimilaritySearchSchema = z.object({
  stream_name: z.string().max(MAX_ID_LENGTH).describe('Stream containing the known KI features.'),
  candidate_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Stable ID intended for the candidate feature.'),
  title: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature title.'),
  description: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature description.'),
  type: z.enum(INFERRED_FEATURE_TYPES).describe('Candidate feature type.'),
});

export const createFeatureSimilaritySearchTool = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof featureSimilaritySearchSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof featureSimilaritySearchSchema> = {
    id: SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Search known feature Knowledge Indicators by meaning for a candidate feature. ' +
      'Returns at most five same-type possible matches in semantic relevance order.',
    annotations: {
      title: 'Search Similar Feature Knowledge Indicators',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: featureSimilaritySearchSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async ({ stream_name: streamName, ...args }, context) => {
      try {
        const scopedClients = await getScopedClients({ request: context.request });
        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });
        await scopedClients.streamsClient.getStream(streamName);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const result = await searchFeatureSimilarity({ kiClient, streamName, args });

        return {
          results: [{ type: ToolResultType.other, data: result }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Feature similarity search failed: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
