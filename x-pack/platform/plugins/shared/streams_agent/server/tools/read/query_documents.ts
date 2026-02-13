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
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_QUERY_DOCUMENTS_TOOL_ID = 'streams.query_documents';

const DEFAULT_DOC_COUNT = 20;
const MAX_DOC_COUNT = 100;
const MAX_FIELD_VALUE_LENGTH = 500;

const queryDocumentsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to query documents from'),
  count: z
    .number()
    .min(1)
    .max(MAX_DOC_COUNT)
    .optional()
    .describe(
      `Number of documents to return (default: ${DEFAULT_DOC_COUNT}, max: ${MAX_DOC_COUNT}). Returns the most recent documents sorted by @timestamp descending.`
    ),
  startMs: z
    .number()
    .optional()
    .describe(
      'Optional start of time range as Unix timestamp in milliseconds. If omitted, no time filter is applied and the most recent documents are returned.'
    ),
  endMs: z
    .number()
    .optional()
    .describe(
      'Optional end of time range as Unix timestamp in milliseconds. If omitted, no upper bound is applied.'
    ),
});

/**
 * Flattens a nested document into dot-notation key-value pairs and truncates long string values.
 * e.g. { body: { text: "hello" }, resource: { attributes: { "host.name": "h1" } } }
 * becomes { "body.text": "hello", "resource.attributes.host.name": "h1" }
 */
function flattenDocument(doc: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    const flatKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && value.length > MAX_FIELD_VALUE_LENGTH) {
      result[flatKey] = value.slice(0, MAX_FIELD_VALUE_LENGTH) + '...';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenDocument(value as Record<string, unknown>, flatKey));
    } else {
      result[flatKey] = value;
    }
  }
  return result;
}

export function createQueryDocumentsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof queryDocumentsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof queryDocumentsSchema> = {
    id: STREAMS_QUERY_DOCUMENTS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Queries recent sample documents from a stream, sorted by @timestamp descending. Use this to inspect what data a stream contains, understand field patterns, or determine the time range of recent activity before calling AI tools. Documents are returned as flat dot-notation key-value maps (e.g. body.text, resource.attributes.host.name). Long string values are truncated.',
    tags: ['streams'],
    schema: queryDocumentsSchema,
    handler: async (toolParams, context) => {
      const { name, count, startMs, endMs } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient, scopedClusterClient } = await getScopedStreamsClients({
          core,
          request,
        });

        // Verify the stream exists
        await streamsClient.getStream(name);

        const resolvedCount = count ?? DEFAULT_DOC_COUNT;

        const hasTimeFilter = startMs !== undefined || endMs !== undefined;
        const query = hasTimeFilter
          ? {
              range: {
                '@timestamp': {
                  ...(startMs !== undefined ? { gte: startMs } : {}),
                  ...(endMs !== undefined ? { lte: endMs } : {}),
                  format: 'epoch_millis' as const,
                },
              },
            }
          : { match_all: {} as const };

        const response = await scopedClusterClient.asCurrentUser.search({
          index: name,
          size: resolvedCount,
          query,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
        });

        const documents = response.hits.hits.map((hit) =>
          flattenDocument(hit._source as Record<string, unknown>)
        );

        const totalHits =
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value ?? 0;

        // Extract the time range of returned documents as epoch millis
        // so the agent can pass them directly to AI tools as startMs/endMs.
        // Handle both string timestamps (ISO 8601) and numeric timestamps (epoch ms).
        let oldestReturnedTimestampMs: number | undefined;
        let newestReturnedTimestampMs: number | undefined;
        if (documents.length > 0) {
          const newestTs = documents[0]['@timestamp'];
          const oldestTs = documents[documents.length - 1]['@timestamp'];
          if (typeof newestTs === 'string') {
            newestReturnedTimestampMs = new Date(newestTs).getTime();
          } else if (typeof newestTs === 'number') {
            newestReturnedTimestampMs = newestTs;
          }
          if (typeof oldestTs === 'string') {
            oldestReturnedTimestampMs = new Date(oldestTs).getTime();
          } else if (typeof oldestTs === 'number') {
            oldestReturnedTimestampMs = oldestTs;
          }
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                documentCount: documents.length,
                totalMatchingDocuments: totalHits,
                timeRange: {
                  ...(startMs !== undefined ? { queriedStartMs: startMs } : {}),
                  ...(endMs !== undefined ? { queriedEndMs: endMs } : {}),
                  oldestReturnedTimestampMs,
                  newestReturnedTimestampMs,
                },
                documents,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.query_documents tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to query documents from "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
