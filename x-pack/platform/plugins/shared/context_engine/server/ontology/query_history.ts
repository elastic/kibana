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

/** The ES|QL queries the tool calls of a round's messages ran. */
export const esqlQueriesOfMessages = (...messageLists: unknown[]): string[] =>
  messageLists.flatMap((messages) =>
    parseMessages(messages).flatMap(({ parts }) =>
      parts
        .filter((part) => part.type === 'tool_call')
        .flatMap((part) => esqlStringsOf(parseArguments(part.arguments)))
    )
  );

const normalize = (query: string): string => query.trim().replace(/\s+/g, ' ');

/**
 * Collects the ES|QL queries agents ran on the given datasets, from the rounds the trace sources
 * found since `since`. Newer queries win when a dataset has more than the cap.
 */
export const readOntologyQueryHistory = async ({
  esClient,
  traces,
  datasets,
  since,
  until,
  size,
}: {
  esClient: ElasticsearchClient;
  traces: AiIndexTraceWithQuery[];
  datasets: string[];
  since: string;
  until: string;
  size: number;
}): Promise<ReadOntologyQueryHistoryOutput> => {
  const sources: ReadOntologyQueryHistoryOutput['sources'] = [];
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
  for (const [target, rounds] of byTarget) {
    const spans = await loadTraceRounds(
      esClient,
      target,
      rounds.map(({ traceId }) => traceId)
    );
    spans.forEach(({ inputMessages, outputMessages }, traceId) =>
      loaded.set(traceId, [inputMessages, outputMessages])
    );
  }

  const seen = new Set<string>();
  const perDataset = new Map<string, number>();
  const queries: OntologyHistoryQuery[] = [];
  for (const { traceId } of newestFirst) {
    for (const query of esqlQueriesOfMessages(...(loaded.get(traceId) ?? []))) {
      const normalized = normalize(query);
      if (normalized.length > MAX_ACCESS_PATTERN_ESQL_LENGTH) {
        continue;
      }
      const from = fromSourcesOf(normalized);
      for (const dataset of datasets) {
        const key = `${dataset}\u0000${normalized}`;
        const count = perDataset.get(dataset) ?? 0;
        if (
          seen.has(key) ||
          count >= MAX_ONTOLOGY_QUERY_HISTORY ||
          !from.some((source) => sourceMatchesDataset(source, dataset))
        ) {
          continue;
        }
        seen.add(key);
        perDataset.set(dataset, count + 1);
        queries.push({
          dataset,
          query: normalized,
          round_id: `${TRACE_ROUND_ID_PREFIX}${traceId}`,
        });
      }
    }
  }

  return { queries, rounds: Math.min(found.length, size), sources };
};
