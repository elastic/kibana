/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { Streams, isIlmLifecycle, isDslLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import {
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID as GET_LIFECYCLE_STATS,
  STREAMS_GET_DATA_QUALITY_TOOL_ID as GET_DATA_QUALITY,
  STREAMS_GET_SCHEMA_TOOL_ID as GET_SCHEMA,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import { classifyError } from './error_utils';
import { getEffectiveLifecycle } from '../../lib/streams/lifecycle/get_effective_lifecycle';
import { ilmPhases } from '../../lib/streams/lifecycle/ilm_phases';

const getLifecycleStatsSchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.nginx"'),
});

export const createGetLifecycleStatsTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof getLifecycleStatsSchema> => ({
  id: GET_LIFECYCLE_STATS,
  type: ToolType.builtin,
  description: dedent(`
    Returns lifecycle and storage statistics for a stream: effective retention policy and its source, total storage size, document count, and ILM tier breakdown (when applicable).

    **When to use:**
    - User asks about retention, storage size, or disk usage
    - User asks "how much data is in stream X?"
    - Comparing storage across streams (call once per stream)

    **When NOT to use:**
    - User wants data quality info — use ${GET_DATA_QUALITY}
    - User wants field mappings — use ${GET_SCHEMA}
  `),
  tags: ['streams'],
  schema: getLifecycleStatsSchema,
  handler: async ({ name }, { request }) => {
    try {
      const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      const definition = await streamsClient.getStream(name);

      if (!Streams.ingest.all.Definition.is(definition)) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                type: 'query',
                message:
                  'Lifecycle stats are only available for ingest streams (wired or classic).',
              },
            },
          ],
        };
      }

      const dataStream = await streamsClient.getDataStream(name);
      const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });

      const retentionInfo = buildRetentionInfo(lifecycle);

      const statsResponse = await esClient.indices.stats({
        index: dataStream.name,
        metric: ['docs', 'store'],
      });

      const totalStats = statsResponse._all?.primaries;
      const totalSizeBytes = totalStats?.store?.size_in_bytes ?? 0;
      const totalDocs = totalStats?.docs?.count ?? 0;

      let phases: unknown;
      if (isIlmLifecycle(lifecycle)) {
        try {
          const { policy } = await esClient.ilm
            .getLifecycle({ name: lifecycle.ilm.policy })
            .then((policies) => policies[lifecycle.ilm.policy]);

          const { indices: indicesIlmDetails } = await esClient.ilm.explainLifecycle({
            index: dataStream.name,
          });
          const indicesStats = statsResponse.indices ?? {};

          phases = ilmPhases({ policy, indicesIlmDetails, indicesStats });
        } catch {
          // ILM details may not be available for all streams
        }
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: name,
              retention: retentionInfo,
              storage_size_bytes: totalSizeBytes,
              storage_size_human: formatBytes(totalSizeBytes),
              document_count: totalDocs,
              ilm_phases: phases,
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get lifecycle stats for stream "${name}": ${message}`,
              stream: name,
              operation: 'get_lifecycle_stats',
              likely_cause: classifyError(err, LIST_STREAMS),
            },
          },
        ],
      };
    }
  },
});

export const buildRetentionInfo = (
  lifecycle: IngestStreamEffectiveLifecycle
): Record<string, unknown> => {
  const info: Record<string, unknown> = {};
  if (isIlmLifecycle(lifecycle)) {
    info.type = 'ilm';
    info.policy_name = lifecycle.ilm.policy;
  } else if (isDslLifecycle(lifecycle)) {
    info.type = 'dsl';
    info.data_retention = lifecycle.dsl.data_retention ?? 'indefinite';
  } else if (isInheritLifecycle(lifecycle)) {
    info.type = 'inherited';
  } else {
    info.type = 'unknown';
  }
  return info;
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${Math.round(value * 100) / 100} ${units[i]}`;
};
