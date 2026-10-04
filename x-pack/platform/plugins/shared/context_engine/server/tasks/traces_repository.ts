/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { EsqlESQLParams } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import {
  AGENT_BUILDER_TRACES_INDEX_PREFIX,
  ANALYZE_AND_IMPROVE_SKILL_ID,
} from '../../common/constants';
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

const LOAD_SKILL_TOOL_NAME = 'load_skill';

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

export interface LoadSkillSpanRow {
  trace_id: string;
  'attributes.gen_ai.tool.call.arguments'?: string | null;
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

/**
 * The only columns whose absence is an expected, tolerable condition: they only
 * appear in the traces mapping once `agentBuilder:tracing:includeToolDetails`
 * (off by default) has been enabled on the cluster. On a cluster where it was
 * never on, the mapping lacks these two columns and query verification fails —
 * without the guard below the signal generator task would burn its maxAttempts
 * and die instead of treating the batch as empty.
 *
 * Deliberately NOT a wildcard match: `runEsqlQuery` is shared by the
 * execute-tool, invoke-agent, and self-analysis queries, so a misspelled or
 * renamed *required* column must still surface as a real failure instead of
 * being silently swallowed into an empty batch.
 */
const OPTIONAL_TRACE_DETAIL_COLUMNS = new Set([
  'attributes.gen_ai.tool.call.arguments',
  'attributes.gen_ai.tool.call.result',
]);

const PROBLEM_LIST_HEADER = /^Found (\d+) problems?$/;
const UNKNOWN_COLUMN_PROBLEM = /^line \d+:\d+: Unknown column \[([^\]]+)\]$/;

/**
 * ES|QL reports a missing column as a 400 `verification_exception` whose `reason`
 * is a problem list — the column-level counterpart to `isEsqlUnknownIndexError`
 * from `@kbn/storage-adapter`. The shape ES actually emits is:
 *
 *     Found 2 problems
 *     line 6:108: Unknown column [attributes.gen_ai.tool.call.arguments]
 *     line 6:147: Unknown column [attributes.gen_ai.tool.call.result]
 *
 * Returns true only when the reason is a well-formed problem list in which EVERY
 * declared problem is one of `OPTIONAL_TRACE_DETAIL_COLUMNS`. Deliberately strict
 * on three axes, because `runEsqlQuery` is shared by the execute-tool,
 * invoke-agent, and self-analysis queries, and a swallowed regression here means
 * the hourly task reports success forever while reading nothing:
 *
 *  1. The declared `Found <n> problem(s)` count must match the number of problem
 *     lines actually present — a truncated or reworded reason is not forgiven.
 *  2. Every problem line must be an `Unknown column [...]` of an allowed name; a
 *     non-column verifier problem (e.g. a type-resolution failure) rejects the
 *     whole error even when an allowed missing column is also reported.
 *  3. A problem line must match the `line <l>:<c>: ` prefix exactly, so a
 *     non-`Unknown column` message can never be mistaken for one.
 *
 * Fails closed: an unrecognised reason shape counts as a real error, which costs
 * a task retry — the safe direction, versus silently reading an empty batch.
 */
export const isEsqlUnknownColumnError = (error: unknown): boolean => {
  if (!(error instanceof errors.ResponseError)) return false;
  const body = error.body as { error?: { type?: string; reason?: string } } | undefined;
  if (error.statusCode !== 400 || body?.error?.type !== 'verification_exception') {
    return false;
  }
  const reason = body?.error?.reason;
  if (typeof reason !== 'string') {
    return false;
  }

  const [header, ...problemLines] = reason.split('\n').filter((line) => line.trim().length > 0);
  const declared = header?.match(PROBLEM_LIST_HEADER);
  if (!declared) {
    return false;
  }
  // A reason that under-reports its own problems is malformed; do not forgive it.
  if (problemLines.length !== Number(declared[1])) {
    return false;
  }

  return problemLines.every((line) => {
    const column = line.match(UNKNOWN_COLUMN_PROBLEM)?.[1];
    return column !== undefined && OPTIONAL_TRACE_DETAIL_COLUMNS.has(column);
  });
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
    if (isEsqlUnknownIndexError(error) || isEsqlUnknownColumnError(error)) {
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

const referencesAnalysisSkill = (args: string | undefined | null): boolean => {
  if (!args) {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(args);
  } catch {
    return false;
  }
  const skill = (parsed as { skill?: unknown } | null)?.skill;
  return typeof skill === 'string' && skill.toLowerCase().includes(ANALYZE_AND_IMPROVE_SKILL_ID);
};

/** Reads the rounds that loaded the feedback loop's own analysis skill. */
export const querySelfAnalysisTraceIds = async (
  esClient: ElasticsearchClient,
  traceIds: string[],
  signal: AbortSignal
): Promise<Set<string>> => {
  if (traceIds.length === 0) {
    return new Set();
  }
  const placeholders = traceIds.map(() => '?').join(', ');
  const query = `
FROM ${TRACES_INDEX_PATTERN}
| WHERE attributes.gen_ai.operation.name == "execute_tool" AND attributes.gen_ai.tool.name == "${LOAD_SKILL_TOOL_NAME}" AND trace_id IN (${placeholders})
| SORT @timestamp ASC
| LIMIT ${MAX_ROWS_PER_QUERY}
| KEEP trace_id, attributes.gen_ai.tool.call.arguments`;

  const response = await runEsqlQuery(esClient, query, signal, traceIds);
  const rows = response ? esqlRowsToObjects<LoadSkillSpanRow>(response) : [];
  return new Set(
    rows
      .filter((row) => referencesAnalysisSkill(row['attributes.gen_ai.tool.call.arguments']))
      .map((row) => row.trace_id)
      .filter((traceId): traceId is string => !!traceId)
  );
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
    map.set(row.trace_id, {
      name: row['attributes.gen_ai.agent.name'] ?? '',
      id: row['attributes.gen_ai.agent.id'] ?? '',
      conversationId: row['attributes.gen_ai.conversation.id'] ?? '',
    });
  }
  return map;
};
