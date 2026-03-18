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
import { getFlattenedObject } from '@kbn/std';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import {
  STREAMS_QUERY_DOCUMENTS_TOOL_ID as QUERY_DOCUMENTS,
  STREAMS_GET_SCHEMA_TOOL_ID as GET_SCHEMA,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import { translateNlToEsDsl } from './nl_to_es_dsl';

const DEFAULT_SIZE = 10;
const MAX_DOCUMENTS = 25;
const MAX_STRING_LENGTH = 200;

const queryDocumentsSchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.nginx"'),
  query: z.string().describe(
    dedent(`Natural language description of what to search or aggregate. Include field names when known. Examples:
      - "show me 10 recent documents"
      - "top 5 values of host.name"
      - "count documents by log.level"
      - "errors from the last hour"
      - "average event.duration where http.response.status_code >= 500"`)
  ),
});

export const createQueryDocumentsTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof queryDocumentsSchema> => ({
  id: QUERY_DOCUMENTS,
  type: ToolType.builtin,
  description: dedent(`
    Queries or aggregates data from a stream using a natural language description. The tool translates the description into an Elasticsearch query internally. Returns documents in flat dot-notation format and/or aggregation results.

    **When to use:**
    - User asks to "show me recent documents" or "what does the data look like?"
    - User asks about specific field values or patterns in the data
    - User wants aggregated metrics (counts, top values, histograms, etc.)
    - Any query or aggregation against stream data

    **When NOT to use:**
    - User wants pre-computed quality/lifecycle metrics — use the focused tool
    - User wants field definitions — use ${GET_SCHEMA}
  `),
  tags: ['streams'],
  schema: queryDocumentsSchema,
  handler: async ({ name, query: nlQuery }, { request, modelProvider }) => {
    try {
      const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      await streamsClient.getStream(name); // Throws if stream not found

      const [fieldCapsResponse, sampleDocs, model] = await Promise.all([
        esClient.fieldCaps({ index: name, fields: ['*'], ignore_unavailable: true }),
        esClient.search({
          index: name,
          sort: [{ '@timestamp': { order: 'desc' as const } }],
          size: 50,
          ignore_unavailable: true,
        }),
        modelProvider.getDefaultModel(),
      ]);

      /*
       * Field discovery and capability classification
       *
       * We combine two sources to build a complete picture of available fields:
       *
       * 1. field_caps API — returns fields that are actually indexed (have mappings).
       *    Each field includes `aggregatable` and `searchable` flags which determine
       *    what ES DSL constructs can use it.
       *
       * 2. Sample documents (_source) — captures fields that exist in stored source
       *    but are NOT indexed. This happens in logsdb mode when the dynamic field
       *    limit is exceeded (`ignore_dynamic_beyond_limit: true`), which is common
       *    for OTel streams with high-cardinality attribute keys. These fields appear
       *    in returned documents but cannot be queried, aggregated, or sorted.
       *
       * Fields are classified into three capability tiers:
       *
       *   aggregatable — indexed and supports queries, aggregations, and sorting.
       *                   Most keyword, numeric, and date fields fall here.
       *
       *   not aggregatable — indexed and searchable (e.g. text fields) but cannot
       *                      be used in aggregations or sorting without a .keyword
       *                      sub-field.
       *
       *   source-only — NOT indexed. Present only in document _source. Cannot be
       *                 used in queries, aggregations, or sorting at all. The NL
       *                 translation LLM is instructed to fall back to returning
       *                 documents and emit a _warning when the user asks to
       *                 aggregate on such a field.
       */
      type FieldCapability = 'aggregatable' | 'not aggregatable' | 'source-only';
      const fieldEntries: Array<{ name: string; type: string; capability: FieldCapability }> = [];
      const knownFields = new Set<string>();

      for (const [fieldName, caps] of Object.entries(fieldCapsResponse.fields)) {
        const capEntries = Object.values(caps);
        if (capEntries.length === 0) continue;
        const firstCap = capEntries[0];
        if (firstCap.metadata_field) continue;

        const type = firstCap.type ?? Object.keys(caps)[0];
        const capability: FieldCapability = firstCap.aggregatable
          ? 'aggregatable'
          : 'not aggregatable';
        fieldEntries.push({ name: fieldName, type, capability });
        knownFields.add(fieldName);
      }

      for (const hit of sampleDocs.hits.hits) {
        for (const field of Object.keys(
          getFlattenedObject(hit._source as Record<string, unknown>)
        )) {
          if (!knownFields.has(field)) {
            fieldEntries.push({ name: field, type: 'unmapped', capability: 'source-only' });
            knownFields.add(field);
          }
        }
      }

      const availableFields = fieldEntries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => `${f.name} (${f.type}, ${f.capability})`)
        .join(', ');

      const translated = await translateNlToEsDsl({
        nlQuery,
        inferenceClient: model.inferenceClient,
        availableFields,
      });
      const requestedSize = translated.size ?? DEFAULT_SIZE;
      const cappedSize =
        translated.aggs && translated.size === undefined
          ? 0
          : Math.min(requestedSize, MAX_DOCUMENTS);

      const searchParams: SearchRequest = {
        index: name,
        query: translated.query ?? { match_all: {} },
        sort: translated.sort ?? [{ '@timestamp': { order: 'desc' } }],
        size: cappedSize,
        ignore_unavailable: true,
      };

      if (translated.aggs) {
        searchParams.aggs = translated.aggs;
      }

      const response = await esClient.search(searchParams);

      const documents = response.hits.hits.map((hit) => {
        const flat = getFlattenedObject(hit._source as Record<string, unknown>);
        const truncated: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(flat)) {
          if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
            truncated[key] = `${value.slice(0, MAX_STRING_LENGTH)}...`;
          } else {
            truncated[key] = value;
          }
        }

        return truncated;
      });

      let oldestReturnedTimestampMs: number | null = null;
      let newestReturnedTimestampMs: number | null = null;

      for (const doc of documents) {
        const ts = doc['@timestamp'];
        if (ts) {
          const ms = typeof ts === 'number' ? ts : new Date(ts as string).getTime();
          if (!Number.isNaN(ms)) {
            if (oldestReturnedTimestampMs === null || ms < oldestReturnedTimestampMs) {
              oldestReturnedTimestampMs = ms;
            }
            if (newestReturnedTimestampMs === null || ms > newestReturnedTimestampMs) {
              newestReturnedTimestampMs = ms;
            }
          }
        }
      }

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      const data: Record<string, unknown> = {
        stream: name,
        documents,
        returned_count: documents.length,
        total_matching: totalHits,
        oldestReturnedTimestampMs,
        newestReturnedTimestampMs,
      };

      if (requestedSize > cappedSize) {
        data.capped = true;
        data.max_documents = MAX_DOCUMENTS;
        data.requested_count = requestedSize;
      }

      if (response.aggregations) {
        data.aggregations = response.aggregations;
      }

      if (translated._warning) {
        data.warning = translated._warning;
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const statusCode = (err as { statusCode?: number }).statusCode;
      const notFound = statusCode === 404 || message.includes('not found');
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to query stream "${name}": ${message}`,
              stream: name,
              operation: 'query_documents',
              likely_cause: notFound
                ? `Stream not found. Use ${LIST_STREAMS} to discover available streams.`
                : 'Insufficient permissions or server error.',
            },
          },
        ],
      };
    }
  },
});
