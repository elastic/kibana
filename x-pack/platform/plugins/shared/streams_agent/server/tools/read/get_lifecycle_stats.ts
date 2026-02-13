/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_GET_LIFECYCLE_STATS_TOOL_ID = 'streams.get_lifecycle_stats';

const getLifecycleStatsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to get lifecycle/retention stats for'),
});

export function createGetLifecycleStatsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof getLifecycleStatsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getLifecycleStatsSchema> = {
    id: STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Gets lifecycle and retention information for a stream, including the current retention policy (type, value, and source), storage size, document count, and ILM phase breakdown (when managed by ILM).',
    tags: ['streams'],
    schema: getLifecycleStatsSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient, scopedClusterClient } = await getScopedStreamsClients({
          core,
          request,
        });
        const esClient = scopedClusterClient.asCurrentUser;
        const streamDefinition = await streamsClient.getStream(name);

        // Extract lifecycle from stream definition
        let lifecycle;
        let lifecycleType: 'ilm' | 'dsl' | 'inherit' | 'unknown' = 'unknown';

        if (
          Streams.WiredStream.Definition.is(streamDefinition) ||
          Streams.ClassicStream.Definition.is(streamDefinition)
        ) {
          lifecycle = streamDefinition.ingest.lifecycle;
          if (lifecycle && 'ilm' in lifecycle) {
            lifecycleType = 'ilm';
          } else if (lifecycle && 'inherit' in lifecycle) {
            lifecycleType = 'inherit';
          } else if (lifecycle) {
            lifecycleType = 'dsl';
          }
        }

        // Get data stream stats for total storage info
        let storageSizeBytes: number | undefined;
        let docCount: number | undefined;
        try {
          const statsResponse = await esClient.indices.stats({ index: name });
          const total = statsResponse._all?.total;
          storageSizeBytes = total?.store?.size_in_bytes;
          docCount = total?.docs?.count;
        } catch {
          // Stats may not be available
        }

        // If ILM-managed, get phase breakdown (same approach as the streams plugin's
        // lifecycle/_stats route: ilm.getLifecycle → ilm.explainLifecycle → indices.stats)
        let ilmPhases:
          | Record<string, { name: string; sizeInBytes: number; minAge?: string }>
          | undefined;
        if (lifecycleType === 'ilm' && lifecycle && 'ilm' in lifecycle) {
          try {
            const policyName = lifecycle.ilm.policy;

            // Destructure { policy } from the ILM response, matching the pattern in
            // the streams plugin's lifecycle/_stats route handler
            const { policy } = await esClient.ilm
              .getLifecycle({ name: policyName })
              .then((policies) => policies[policyName]);

            const [explainResponse, indicesStatsResponse] = await Promise.all([
              esClient.ilm.explainLifecycle({ index: name }),
              esClient.indices.stats({ index: name, level: 'indices' }),
            ]);

            const indicesIlmDetails = explainResponse.indices;
            const indicesStats = indicesStatsResponse.indices ?? {};

            if (policy?.phases) {
              const phases: Record<string, { name: string; sizeInBytes: number; minAge?: string }> =
                {};
              const phaseNames = ['hot', 'warm', 'cold', 'frozen', 'delete'] as const;

              for (const phaseName of phaseNames) {
                const phase = policy.phases[phaseName];
                if (!phase) continue;

                if (phaseName === 'delete') {
                  phases[phaseName] = {
                    name: phaseName,
                    sizeInBytes: 0,
                    minAge: phase.min_age?.toString(),
                  };
                  continue;
                }

                // Aggregate storage for indices in this phase
                const sizeInBytes = Object.values(indicesIlmDetails)
                  .filter((detail) => detail.managed && detail.phase === phaseName)
                  .reduce((size, detail) => {
                    const indexStats = indicesStats[detail.index!];
                    return size + (indexStats?.total?.store?.total_data_set_size_in_bytes ?? 0);
                  }, 0);

                phases[phaseName] = {
                  name: phaseName,
                  sizeInBytes,
                  minAge: phase.min_age?.toString(),
                };
              }

              ilmPhases = phases;
            }
          } catch (e) {
            logger.debug(`Could not fetch ILM phase breakdown for ${name}: ${e.message}`);
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                lifecycleType,
                lifecycle,
                storageSizeBytes,
                documentCount: docCount,
                ...(ilmPhases ? { ilmPhases } : {}),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.get_lifecycle_stats tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get lifecycle stats for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
