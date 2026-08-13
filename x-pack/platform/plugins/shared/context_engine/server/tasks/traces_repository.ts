/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlESQLParams } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { AGENT_BUILDER_TRACES_INDEX_PREFIX, MANAGEMENT_AGENT_ID } from '../../common/constants';
import type { AgentInfo, ExecuteToolSpan } from './transform';

/** Max rows read per ES|QL query in a single run (the per-run cap). */
export const MAX_ROWS_PER_QUERY = 1000;

const TRACES_INDEX_PREFIX = AGENT_BUILDER_TRACES_INDEX_PREFIX;
const TRACES_INDEX_PATTERN = `${TRACES_INDEX_PREFIX}*`;

/**
 * The only tool whose spans become signals: it runs an ES|QL query and returns rows.
 * Filtering at read-time keeps non-ES|QL tool calls out of the per-run row budget so
 * they are never fetched only to be discarded by `build()` (query_kind === 'other').
 */
const EXECUTE_ESQL_TOOL_NAME = 'platform.core.execute_esql';
const BACKING_INDEX_PREFIX = '.ds-';
const GENERATIONAL_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;

export interface InvokeAgentSpanRow {
  trace_id: string;
  'attributes.gen_ai.conversation.id'?: string | null;
  'attributes.gen_ai.agent.id'?: string | null;
  'attributes.gen_ai.agent.name'?: string | null;
}

export interface ToolSpanReadRow extends ExecuteToolSpan {
  _index?: string | null;
}

/** Derives the Kibana space from a traces span's `_index`. */
export const spaceFromTracesIndex = (index: string | undefined | null): string | undefined => {
  if (!index) {
    return undefined;
  }
  const withoutBacking = index.startsWith(BACKING_INDEX_PREFIX)
    ? index.slice(BACKING_INDEX_PREFIX.length)
    : index;
  if (!withoutBacking.startsWith(TRACES_INDEX_PREFIX)) {
    return undefined;
  }
  const space = withoutBacking.slice(TRACES_INDEX_PREFIX.length).replace(GENERATIONAL_SUFFIX, '');
  return space || undefined;
};

const esqlRowsToObjects = <TRow>(response: ESQLSearchResponse): TRow[] => {
  const columns = response.columns ?? [];
  return (response.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    row.forEach((value, index) => {
      const name = columns[index]?.name;
      if (name) {
        record[name] = value;
      }
    });
    return record as TRow;
  });
};

const runEsqlQuery = async (
  esClient: ElasticsearchClient,
  query: string,
  signal: AbortSignal,
  params?: EsqlESQLParams
): Promise<ESQLSearchResponse | undefined> => {
  try {
    return (await esClient.esql.query(
      { query, ...(params && params.length > 0 ? { params } : {}) },
      { signal }
    )) as unknown as ESQLSearchResponse;
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};

/** Reads the `invoke_agent` spans for the given rounds (trace_id-scoped, watermark-independent). */
export const queryInvokeAgentSpans = async (
  esClient: ElasticsearchClient,
  traceIds: string[],
  signal: AbortSignal
): Promise<InvokeAgentSpanRow[]> => {
  if (traceIds.length === 0) {
    return [];
  }
  const placeholders = traceIds.map(() => '?').join(', ');
  const query = `
FROM ${TRACES_INDEX_PATTERN}
| WHERE attributes.gen_ai.operation.name == "invoke_agent" AND attributes.elastic.inference.span.kind == "AGENT" AND trace_id IN (${placeholders})
| SORT @timestamp ASC
| LIMIT ${MAX_ROWS_PER_QUERY}
| KEEP trace_id, attributes.gen_ai.conversation.id, attributes.gen_ai.agent.id, attributes.gen_ai.agent.name`;

  const response = await runEsqlQuery(esClient, query, signal, traceIds);
  return response ? esqlRowsToObjects<InvokeAgentSpanRow>(response) : [];
};

/** Reads new `execute_tool` spans across all spaces since the watermark. */
export const queryExecuteToolSpans = async (
  esClient: ElasticsearchClient,
  watermark: string | undefined,
  signal: AbortSignal
): Promise<ToolSpanReadRow[]> => {
  const query = `
FROM ${TRACES_INDEX_PATTERN} METADATA _index
| WHERE attributes.gen_ai.operation.name == "execute_tool" AND attributes.gen_ai.tool.name == "${EXECUTE_ESQL_TOOL_NAME}"${
    watermark ? '\n| WHERE @timestamp >= ?watermark' : ''
  }
| SORT @timestamp ASC
| LIMIT ${MAX_ROWS_PER_QUERY}
| KEEP _index, @timestamp, trace_id, span_id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.id, attributes.gen_ai.tool.call.arguments, attributes.gen_ai.tool.call.result, duration, status.code, status.message`;

  const response = await runEsqlQuery(
    esClient,
    query,
    signal,
    watermark ? [{ watermark }] : undefined
  );
  return response ? esqlRowsToObjects<ToolSpanReadRow>(response) : [];
};

/** Maps each round id to its `invoke_agent` span's agent identity. */
export const buildConvAgentMap = (rows: InvokeAgentSpanRow[]): Map<string, AgentInfo> => {
  const map = new Map<string, AgentInfo>();
  for (const row of rows) {
    if (!row.trace_id || map.has(row.trace_id)) {
      continue;
    }
    const id = row['attributes.gen_ai.agent.id'] ?? '';
    map.set(row.trace_id, {
      name: row['attributes.gen_ai.agent.name'] ?? '',
      id,
      class: id === MANAGEMENT_AGENT_ID ? 'management' : 'user',
      conversationId: row['attributes.gen_ai.conversation.id'] ?? '',
    });
  }
  return map;
};
