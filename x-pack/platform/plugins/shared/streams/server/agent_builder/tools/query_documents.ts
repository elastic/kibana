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
import { Streams } from '@kbn/streams-schema';
import type { SearchRequest, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import {
  STREAMS_QUERY_DOCUMENTS_TOOL_ID as QUERY_DOCUMENTS,
  STREAMS_GET_SCHEMA_TOOL_ID as GET_SCHEMA,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import { translateNlToEsDsl } from './nl_to_es_dsl';
import { classifyError } from './error_utils';

const DEFAULT_SIZE = 10;
const MAX_DOCUMENTS = 25;
const MAX_STRING_LENGTH = 200;
const MAX_FIELDS_FOR_PROMPT = 1000;
const MAX_FIELDS_PROMPT_CHARS = 20_000;

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

      const definition = await streamsClient.getStream(name);
      const definitionFieldTypes = getDefinitionFieldTypes(definition);

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

      const fieldEntries = classifyFields({
        fieldCapsFields: fieldCapsResponse.fields,
        sampleHits: sampleDocs.hits.hits,
        definitionFieldTypes,
      });

      const availableFields = buildAvailableFieldsPrompt(fieldEntries);

      const translated = await translateNlToEsDsl({
        nlQuery,
        inferenceClient: model.inferenceClient,
        availableFields,
      });

      const { requestedSize, cappedSize } = computeSearchSize(translated);

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

      const documents = flattenAndTruncateDocs(response.hits.hits);
      const { oldest: oldestReturnedTimestampMs, newest: newestReturnedTimestampMs } =
        computeTimestampRange(documents);

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
        const aggNote = detectEmptyAggregations(
          response.aggregations as Record<string, unknown>,
          totalHits
        );
        if (aggNote) {
          data.aggregation_note = aggNote;
        }
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
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to query stream "${name}": ${message}`,
              stream: name,
              operation: 'query_documents',
              likely_cause: classifyError(err, LIST_STREAMS),
            },
          },
        ],
      };
    }
  },
});

export type FieldCapability = 'aggregatable' | 'not aggregatable' | 'source-only';

export interface FieldEntry {
  name: string;
  type: string;
  capability: FieldCapability;
}

export const getDefinitionFieldTypes = (
  definition: Streams.all.Definition
): Map<string, string> => {
  const map = new Map<string, string>();
  if (Streams.WiredStream.Definition.is(definition)) {
    for (const [fn, fd] of Object.entries(definition.ingest.wired.fields)) {
      if (fd.type) map.set(fn, fd.type);
    }
  } else if (Streams.ClassicStream.Definition.is(definition)) {
    for (const [fn, fd] of Object.entries(definition.ingest.classic.field_overrides || {})) {
      if (fd.type) map.set(fn, fd.type);
    }
  }
  return map;
};

export const classifyFields = ({
  fieldCapsFields,
  sampleHits,
  definitionFieldTypes,
}: {
  fieldCapsFields: Record<
    string,
    Record<string, { type?: string; aggregatable?: boolean; metadata_field?: boolean }>
  >;
  sampleHits: Array<SearchHit<unknown>>;
  definitionFieldTypes: Map<string, string>;
}): FieldEntry[] => {
  const fieldEntries: FieldEntry[] = [];
  const knownFields = new Set<string>();

  for (const [fieldName, caps] of Object.entries(fieldCapsFields)) {
    const capEntries = Object.values(caps);
    if (capEntries.length === 0) continue;
    const firstCap = capEntries[0];
    if (firstCap.metadata_field) continue;

    const type = definitionFieldTypes.get(fieldName) ?? firstCap.type ?? Object.keys(caps)[0];
    const capability: FieldCapability = firstCap.aggregatable ? 'aggregatable' : 'not aggregatable';
    fieldEntries.push({ name: fieldName, type, capability });
    knownFields.add(fieldName);
  }

  for (const hit of sampleHits) {
    if (!hit._source) continue;
    for (const field of Object.keys(getFlattenedObject(hit._source as Record<string, unknown>))) {
      if (!knownFields.has(field)) {
        fieldEntries.push({ name: field, type: 'unmapped', capability: 'source-only' });
        knownFields.add(field);
      }
    }
  }

  return fieldEntries;
};

export const buildAvailableFieldsPrompt = (
  fieldEntries: FieldEntry[],
  maxFields = MAX_FIELDS_FOR_PROMPT,
  maxChars = MAX_FIELDS_PROMPT_CHARS
): string => {
  const sortedEntries = [...fieldEntries].sort((a, b) => a.name.localeCompare(b.name));
  const truncatedEntries = sortedEntries.slice(0, maxFields);
  let result = truncatedEntries.map((f) => `${f.name} (${f.type}, ${f.capability})`).join(', ');
  if (result.length > maxChars) {
    result = `${result.slice(0, maxChars)}…`;
  }
  if (truncatedEntries.length < sortedEntries.length) {
    const omitted = sortedEntries.length - truncatedEntries.length;
    result += ` (${omitted} more fields omitted)`;
  }
  return result;
};

export const computeSearchSize = (translated: {
  aggs?: unknown;
  size?: number;
}): { requestedSize: number; cappedSize: number } => {
  const requestedSize = Math.max(0, translated.size ?? DEFAULT_SIZE);
  const cappedSize =
    translated.aggs && translated.size === undefined ? 0 : Math.min(requestedSize, MAX_DOCUMENTS);
  return { requestedSize, cappedSize };
};

export const flattenAndTruncateDocs = (
  hits: Array<SearchHit<unknown>>,
  maxStringLength = MAX_STRING_LENGTH
): Array<Record<string, unknown>> => {
  return hits.map((hit) => {
    const flat = getFlattenedObject((hit._source ?? {}) as Record<string, unknown>);
    const truncated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value === 'string' && value.length > maxStringLength) {
        truncated[key] = `${value.slice(0, maxStringLength)}...`;
      } else {
        truncated[key] = value;
      }
    }
    return truncated;
  });
};

export const computeTimestampRange = (
  documents: Array<Record<string, unknown>>
): { oldest: number | null; newest: number | null } => {
  let oldest: number | null = null;
  let newest: number | null = null;

  for (const doc of documents) {
    const ts = doc['@timestamp'];
    if (ts) {
      const ms = typeof ts === 'number' ? ts : new Date(ts as string).getTime();
      if (!Number.isNaN(ms)) {
        if (oldest === null || ms < oldest) oldest = ms;
        if (newest === null || ms > newest) newest = ms;
      }
    }
  }
  return { oldest, newest };
};

export const detectEmptyAggregations = (
  aggregations: Record<string, unknown>,
  totalHits: number
): string | undefined => {
  const allBucketsEmpty = Object.values(aggregations).every((agg) => {
    const buckets = (agg as { buckets?: unknown[] }).buckets;
    return Array.isArray(buckets) ? buckets.length === 0 : false;
  });
  if (allBucketsEmpty && totalHits > 0) {
    return 'All aggregations returned empty results. The field(s) may exist in the mapping but have no values in the data.';
  }
  return undefined;
};
