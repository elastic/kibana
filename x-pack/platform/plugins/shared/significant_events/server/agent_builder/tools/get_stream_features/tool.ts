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
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { QUERY_GENERATION_EXCLUDED_FEATURE_TYPES, toFeatureForLlmContext } from '@kbn/streams-ai';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSignificantEventsAvailability } from '../significant_events_availability';

export const SIGNIFICANT_EVENTS_GET_STREAM_FEATURES_TOOL_ID =
  platformSignificantEventsTools.getStreamFeatures;

const getStreamFeaturesSchema = z.object({
  stream_name: z.string().max(MAX_ID_LENGTH).describe('Stream whose KI features should be loaded.'),
  feature_types: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(20)
    .optional()
    .describe('Optional KI feature types to return. Unknown types produce no matches.'),
  min_confidence: z.number().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const createGetStreamFeaturesTool = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof getStreamFeaturesSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof getStreamFeaturesSchema> = {
    id: SIGNIFICANT_EVENTS_GET_STREAM_FEATURES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Load the extracted and computed KI features for one stream before generating detection queries.',
    annotations: {
      title: 'Get Stream Features',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: getStreamFeaturesSchema,
    tags: ['streams', 'significant-events', 'query-generation'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (
      {
        stream_name: streamName,
        feature_types: featureTypes,
        min_confidence: minConfidence,
        limit,
      },
      context
    ) => {
      try {
        const scopedClients = await getScopedClients({ request: context.request });
        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });
        await scopedClients.streamsClient.getStream(streamName);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const { hits } = await kiClient.getFeatures(streamName, {
          type: featureTypes,
          minConfidence,
          limit,
          excludedType: [...QUERY_GENERATION_EXCLUDED_FEATURE_TYPES],
        });
        const features = hits.map(toFeatureForLlmContext);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { features, count: features.length },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Get stream features failed: ${message}`);
        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }
    },
  };

  return toolDefinition;
};
