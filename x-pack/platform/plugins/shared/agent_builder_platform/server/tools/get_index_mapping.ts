/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { MappingField } from '@kbn/agent-builder-genai-utils';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { getIndexFields, isCcsTarget } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const getIndexMappingsSchema = z.object({
  indices: z
    .array(z.string())
    .min(1)
    .describe('List of indices, aliases or datastreams to retrieve mappings for.'),
  raw: z
    .boolean()
    .default(false)
    .describe('Whether to return the raw mapping tree instead of the summarized fields.'),
});

const formatField = (field: MappingField): string => {
  const description = field.meta.description ? ` ${field.meta.description}` : '';
  return `- ${field.path} [${field.type}]${description}`;
};

interface IndexModeInfo {
  index_mode?: string;
  data_stream?: string;
  ts_hint?: string;
}

const TS_HINT =
  'time_series mode detected. Use `TS <data-stream>` (not `FROM`), `TBUCKET(interval)` (not ' +
  '`DATE_TRUNC`), wrap counter fields with `SUM(RATE(...))`, and use `AVG(...)` / `MAX(...)` ' +
  'for gauges. TBUCKET takes only a duration: `TBUCKET(5 minutes)`.';

const getIndexMode = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<string | undefined> => {
  try {
    const response = await esClient.indices.getSettings({ index, flat_settings: true });
    const entry = response[index] ?? Object.values(response)[0];
    const settings = entry?.settings as Record<string, string> | undefined;
    return settings?.['index.mode'];
  } catch {
    return undefined;
  }
};

const resolveDataStreamName = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<string | undefined> => {
  try {
    const response = await esClient.indices.resolveIndex({ name: index });
    const match = response.indices?.find((i) => i.data_stream);
    return match?.data_stream;
  } catch {
    return undefined;
  }
};

const getIndexModeInfo = async (
  esClient: ElasticsearchClient,
  input: string,
  resourceType: string
): Promise<IndexModeInfo | undefined> => {
  // index.mode detection only works for concrete local indices/data streams.
  // CCS targets and patterns are skipped to avoid noisy errors.
  if (isCcsTarget(input) || resourceType === 'indexPattern') {
    return undefined;
  }
  const indexMode = await getIndexMode(esClient, input);
  if (!indexMode) {
    return undefined;
  }
  if (indexMode !== 'time_series') {
    return { index_mode: indexMode };
  }
  // For data stream inputs, the input itself is the data stream name. For backing
  // index inputs, resolve to the parent data stream so the agent can use it with TS.
  const dataStream =
    resourceType === 'dataStream' ? input : await resolveDataStreamName(esClient, input);
  return {
    index_mode: 'time_series',
    ...(dataStream ? { data_stream: dataStream } : {}),
    ts_hint: TS_HINT,
  };
};

export const getIndexMappingsTool = (): BuiltinToolDefinition<typeof getIndexMappingsSchema> => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description: `Retrieve mappings for indices, aliases or datastreams.

When an index is in time_series mode, the result includes 'index_mode: time_series', the parent
'data_stream' name (when resolvable), and a 'ts_hint' string with TS-mode syntax guidance.`,
    schema: getIndexMappingsSchema,
    handler: async ({ indices, raw }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        esClient: esClient.asCurrentUser,
      });

      const indexModeInfos = await Promise.all(
        Object.entries(indexFields).map(async ([name, v]) => {
          const info = await getIndexModeInfo(esClient.asCurrentUser, name, v.type);
          return [name, info] as const;
        })
      );
      const indexModeMap = new Map(indexModeInfos);

      const resources = Object.fromEntries(
        Object.entries(indexFields).map(([name, v]) => {
          const indexModeInfo = indexModeMap.get(name);
          const baseEntry = indexModeInfo ? { ...indexModeInfo } : {};
          if (raw && v.rawMapping) {
            return [name, { ...baseEntry, type: v.type, mappings: v.rawMapping }];
          }
          if (raw) {
            return [
              name,
              {
                ...baseEntry,
                type: v.type,
                fields: v.fields.map(({ path, type }) => ({ path, type })),
              },
            ];
          }
          return [
            name,
            { ...baseEntry, type: v.type, fields: v.fields.map(formatField).join('\n') },
          ];
        })
      );

      return { results: [otherResult({ resources })] };
    },
    tags: [],
  };
};
