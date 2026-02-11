/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StreamsAgentCoreSetup } from '../types';
import { getScopedStreamsClients } from './get_scoped_clients';

export const STREAMS_GET_DATA_QUALITY_TOOL_ID = 'streams.get_data_quality';

const getDataQualitySchema = z.object({
  name: z.string().min(1).describe('The name of the stream to check data quality for'),
});

export function createGetDataQualityTool({
  core,
  logger,
}: {
  core: StreamsAgentCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof getDataQualitySchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getDataQualitySchema> = {
    id: STREAMS_GET_DATA_QUALITY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Gets data quality metrics for a stream: degraded document count and percentage, failed document count and percentage, overall quality score (Good/Degraded/Poor), and whether the failure store is enabled.',
    tags: ['streams'],
    schema: getDataQualitySchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request } = context;
      try {
        const { scopedClusterClient } = await getScopedStreamsClients({ core, request });
        const esClient = scopedClusterClient.asCurrentUser;

        // Get total doc count
        const countResponse = await esClient.count({ index: name });
        const totalDocs = countResponse.count;

        // Get degraded docs (documents with _ignored field)
        const degradedResponse = await esClient.count({
          index: name,
          query: { exists: { field: '_ignored' } },
        });
        const degradedDocs = degradedResponse.count;
        const degradedPercentage = totalDocs > 0 ? (degradedDocs / totalDocs) * 100 : 0;

        // Check failure store
        let failedDocs = 0;
        try {
          const failedResponse = await esClient.count({ index: `${name}::failures` });
          failedDocs = failedResponse.count;
        } catch {
          // Failure store may not exist
        }
        const failedPercentage = totalDocs > 0 ? (failedDocs / totalDocs) * 100 : 0;

        // Calculate quality score
        let qualityScore: 'Good' | 'Degraded' | 'Poor';
        if (degradedPercentage === 0 && failedPercentage === 0) {
          qualityScore = 'Good';
        } else if (degradedPercentage <= 3 && failedPercentage <= 3) {
          qualityScore = 'Degraded';
        } else {
          qualityScore = 'Poor';
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                totalDocuments: totalDocs,
                degradedDocuments: degradedDocs,
                degradedPercentage: Math.round(degradedPercentage * 100) / 100,
                failedDocuments: failedDocs,
                failedPercentage: Math.round(failedPercentage * 100) / 100,
                qualityScore,
                failureStoreEnabled: failedDocs > 0 || false,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.get_data_quality tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get data quality for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
