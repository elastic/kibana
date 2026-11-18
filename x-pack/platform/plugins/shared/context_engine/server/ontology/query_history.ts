/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexTraceWithQuery } from '../../common/http_api/ai_indices';
import { MAX_ACCESS_PATTERN_ESQL_LENGTH } from '../../common/dreaming';
import { MAX_ONTOLOGY_QUERY_HISTORY } from '../../common/ontology';
import type {
  OntologyHistoryQuery,
  ReadOntologyQueryHistoryOutput,
} from '../../common/step_types/read_ontology_query_history';
import { TRACE_ROUND_ID_PREFIX } from '../dreaming/ids';
import { findTraceRounds, loadTraceRounds, type TraceRound } from '../dreaming/trace_rounds';
import { parseMessages } from '../dreaming/trace_transcripts';
import { formatErrorMessage } from '../utils/format_es_error';
import { fromSourcesOf, sourceMatchesDataset } from './esql';

const ESQL_START = /^\s*FROM\s/i;
const MAX_NESTING = 5;

const parseArguments = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/** Every string in a tool call's arguments that reads as an ES|QL query. */
const esqlStringsOf = (value: unknown, depth = 0): string[] => {
  if (typeof value === 'string') {
    return ESQL_START.test(value) ? [value] : [];
  }
  if (depth >= MAX_NESTING || value === null || typeof value !== 'object') {
    return [];
  }
  return Object.values(value as Record<string, unknown>).flatMap((entry) =>
    esqlStringsOf(entry, depth + 1)
  );
};

const toolCallsOf = (messageLists: unknown[]) =>
  messageLists.flatMap((messages) =>
    parseMessages(messages).flatMap(({ parts }) =>
      parts.filter((part) => part.type === 'tool_call')
    )
  );

/** The ES|QL queries the tool calls of a round's messages ran. */
export const esqlQueriesOfMessages = (...messageLists: unknown[]): string[] =>
  toolCallsOf(messageLists).flatMap((part) => esqlStringsOf(parseArguments(part.arguments)));

/** The tool agents call connector sub-actions with, as its id or its model-safe name. */
const EXECUTE_CONNECTOR_SUB_ACTION_TOOL = 'platform_core_execute_connector_sub_action';

const isExecuteConnectorSubAction = (name: unknown): boolean =>
  typeof name === 'string' && name.replace(/\./g, '_') === EXECUTE_CONNECTOR_SUB_ACTION_TOOL;

/** The sub-action calls the tool calls of a round's messages made on a connector, as JSON. */
export const connectorCallsOfMessages = (
  connectorId: string,
  ...messageLists: unknown[]
): string[] =>
  toolCallsOf(messageLists).flatMap((part) => {
    if (!isExecuteConnectorSubAction(part.name)) {
      return [];
    }
    const args = parseArguments(part.arguments) as
      | { connectorId?: unknown; subAction?: unknown; params?: unknown }
      | undefined;
    return args?.connectorId === connectorId && typeof args.subAction === 'string'
      ? [JSON.stringify({ subAction: args.subAction, params: args.params ?? {} })]
      : [];
  });

/** Which calls a query history read keeps: ES|QL queries on datasets, or a connector's calls. */
export type QueryHistoryTarget =
  | { kind: 'esql'; datasets: string[] }
  | { kind: 'connector'; connectorId: string; dataset: string };

const normalize = (query: string): string => query.trim().replace(/\s+/g, ' ');

/**
 * Collects the ES|QL queries agents ran on the given datasets, or the sub-action calls they made on
 * a connector, from the rounds the trace sources found since `since`. Newer calls win when a
 * dataset has more than the cap.
 */
export const readOntologyQueryHistory = async ({
  esClient,
  traces,
  target,
  since,
  until,
  size,
}: {
  esClient: ElasticsearchClient;
  traces: AiIndexTraceWithQuery[];
  target: QueryHistoryTarget;
  since: string;
  until: string;
  size: number;
}): Promise<ReadOntologyQueryHistoryOutput> => {
  const sources: ReadOntologyQueryHistoryOutput['sources'] = [];
  const datasets = target.kind === 'esql' ? target.datasets : [target.dataset];
  if (datasets.length === 0 || Date.parse(until) <= Date.parse(since)) {
    return { queries: [], rounds: 0, sources };
  }

  const found: TraceRound[] = [];
  for (const { type, value, query } of traces) {
    try {
      const rounds = await findTraceRounds({ esClient, query, since, after: '', until, size });
      sources.push({ type, value, rounds: rounds.length });
      found.push(...rounds);
    } catch (error) {
      sources.push({ type, value, rounds: 0, error: formatErrorMessage(error) });
    }
  }

  const byTarget = new Map<string, TraceRound[]>();
  for (const round of found.slice(0, size)) {
    byTarget.set(round.target, [...(byTarget.get(round.target) ?? []), round]);
  }

  const newestFirst = [...found.slice(0, size)].sort(
    (a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt)
  );
  const loaded = new Map<string, unknown[]>();
  for (const [spanTarget, rounds] of byTarget) {
    const spans = await loadTraceRounds(
      esClient,
      spanTarget,
      rounds.map(({ traceId }) => traceId)
    );
    spans.forEach(({ inputMessages, outputMessages }, traceId) =>
      loaded.set(traceId, [inputMessages, outputMessages])
    );
  }

  const seen = new Set<string>();
  const perDataset = new Map<string, number>();
  const queries: OntologyHistoryQuery[] = [];
  const keep = (dataset: string, query: string, traceId: string) => {
    const key = `${dataset}\u0000${query}`;
    const count = perDataset.get(dataset) ?? 0;
    if (seen.has(key) || count >= MAX_ONTOLOGY_QUERY_HISTORY) {
      return;
    }
    seen.add(key);
    perDataset.set(dataset, count + 1);
    queries.push({ dataset, query, round_id: `${TRACE_ROUND_ID_PREFIX}${traceId}` });
  };
  for (const { traceId } of newestFirst) {
    const messages = loaded.get(traceId) ?? [];
    if (target.kind === 'connector') {
      for (const call of connectorCallsOfMessages(target.connectorId, ...messages)) {
        if (call.length <= MAX_ACCESS_PATTERN_ESQL_LENGTH) {
          keep(target.dataset, call, traceId);
        }
      }
      continue;
    }
    for (const query of esqlQueriesOfMessages(...messages)) {
      const normalized = normalize(query);
      if (normalized.length > MAX_ACCESS_PATTERN_ESQL_LENGTH) {
        continue;
      }
      const from = fromSourcesOf(normalized);
      for (const dataset of datasets) {
        if (from.some((source) => sourceMatchesDataset(source, dataset))) {
          keep(dataset, normalized, traceId);
        }
      }
    }
  }

  return { queries, rounds: Math.min(found.length, size), sources };
};
