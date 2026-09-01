/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AiIndexSignalTimeRange, AiIndexSource } from '../../common/http_api/ai_indices';
import type { Signal } from '../../common/http_api/signals';
import { SIGNAL_INDEX_PREFIX } from '../../common/http_api/signals';
import { parseFromClause } from '../tasks/transform';
import { resolveSignalWindow } from './window';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

/** The whole `data.returned.columns` array is evidence nobody reads at this size. */
const SIGNAL_SOURCE_EXCLUDES = ['data.returned.columns'] as const;

/**
 * Cap on the conversations carried from the retrieval pass into the co-occurrence pass. A `terms`
 * clause is bounded server-side anyway, and the busiest conversations are the ones already
 * represented by the retrieval signals themselves.
 */
const MAX_COOCCURRENCE_CONVERSATIONS = 1000;

export interface SelectSignalsOptions {
  /** The AI index's `dest.value` — the authoritative locator for where its KIs live. */
  destValue: string;
  /** The AI index's sources; the ES|QL ones name the raw indices a fallback would read. */
  sources: AiIndexSource[];
  signalTimeRange?: AiIndexSignalTimeRange;
  /** KQL from `feedback_analysis.signal_filter`, applied on top of the window. */
  signalFilter?: string;
  /** Cap on the signals returned. */
  size: number;
  /** Injectable for tests; defaults to the wall clock. */
  now?: Date;
}

export interface SelectSignalsResult {
  signals: Signal[];
  /** Spaces the selected signals came from, derived from the index each hit landed in. */
  spaces: string[];
  window: { from: string; to: string };
}

/** Splits a comma-separated index expression into its trimmed, non-empty parts. */
const splitExpressions = (value: string): string[] =>
  value
    .split(',')
    .map((expression) => expression.trim())
    .filter((expression) => expression.length > 0);

/**
 * Matches `data.target_index` against a set of index expressions.
 *
 * Literals become a `terms` clause and wildcards a `wildcard` clause, both of which `flattened`
 * supports natively — the signals mapping stores the whole `data` object as one flattened field,
 * so the sub-field is queryable without any extraction step.
 *
 * A signal that named a *broader* pattern than the expression given (`logs-*` where the source
 * says `logs-app-1`) is not matched here, because Elasticsearch has no "their pattern matches my
 * literal" query. Those are picked up by the co-occurrence pass instead, which is why that pass
 * exists rather than being an optimisation.
 */
const buildTargetMatch = (expressions: string[]): QueryDslQueryContainer | undefined => {
  const literals: string[] = [];
  const should: QueryDslQueryContainer[] = [];

  for (const expression of expressions) {
    if (expression.includes('*')) {
      should.push({ wildcard: { 'data.target_index': { value: expression } } });
    } else {
      literals.push(expression);
    }
  }

  if (literals.length > 0) {
    should.push({ terms: { 'data.target_index': literals } });
  }

  return should.length > 0 ? { bool: { should, minimum_should_match: 1 } } : undefined;
};

/** The raw indices this AI index draws from, parsed out of its ES|QL sources' `FROM` clauses. */
export const rawIndexExpressionsFor = (sources: AiIndexSource[]): string[] => {
  const expressions = new Set<string>();
  for (const source of sources) {
    if (source.type !== 'esql') {
      continue;
    }
    const clause = parseFromClause(source.value);
    if (!clause) {
      continue;
    }
    for (const expression of splitExpressions(clause)) {
      expressions.add(expression);
    }
  }
  return [...expressions];
};

const spaceFromIndexName = (index: string | undefined): string | undefined => {
  if (!index || !index.startsWith(SIGNAL_INDEX_PREFIX)) {
    return undefined;
  }
  const spaceId = index.slice(SIGNAL_INDEX_PREFIX.length);
  return spaceId.length > 0 ? spaceId : undefined;
};

/**
 * Filters every selection shares: the window, the signal type, the classifier's blind spot, and
 * the index's own KQL narrowing.
 *
 * Management-agent signals are excluded because they describe Context Engine's own tooling rather
 * than an agent failing to find context — `classify` already leaves them untagged, so including
 * them would only pad the sample.
 */
const buildBaseQuery = ({
  from,
  to,
  signalFilter,
}: {
  from: string;
  to: string;
  signalFilter?: string;
}): QueryDslQueryContainer[] => {
  const filters: QueryDslQueryContainer[] = [
    { range: { '@timestamp': { gte: from, lte: to } } },
    { term: { signal_type: 'tool_call' } },
  ];

  if (signalFilter) {
    filters.push(toElasticsearchQuery(fromKueryExpression(signalFilter)));
  }

  return filters;
};

const MANAGEMENT_AGENT_CLAUSE: QueryDslQueryContainer = {
  term: { 'data.agent.class': 'management' },
};

interface SearchOptions {
  esClient: ElasticsearchClient;
  filter: QueryDslQueryContainer[];
  size: number;
}

const searchSignals = async ({
  esClient,
  filter,
  size,
}: SearchOptions): Promise<Array<{ signal: Signal; space?: string }>> => {
  if (size <= 0) {
    return [];
  }

  const response = await esClient.search<Signal>({
    index: `${SIGNAL_INDEX_PREFIX}*`,
    ...LENIENT_INDEX_OPTIONS,
    size,
    track_total_hits: false,
    _source: { excludes: [...SIGNAL_SOURCE_EXCLUDES] },
    query: { bool: { filter, must_not: [MANAGEMENT_AGENT_CLAUSE] } },
    // `signal_id` breaks ties: signals are written in trace batches and share timestamps freely,
    // so without it the sample taken at `size` would vary between two identical runs.
    sort: [{ '@timestamp': { order: 'desc' } }, { signal_id: { order: 'desc' } }],
  });

  return response.hits.hits
    .filter((hit) => hit._source != null)
    .map((hit) => ({ signal: hit._source as Signal, space: spaceFromIndexName(hit._index) }));
};

/**
 * Selects the signals that describe one AI index's retrieval quality.
 *
 * Signals are index-agnostic — they record that an agent ran a query, not which AI index the query
 * was meant to serve — so attribution is the whole problem. It is done in two passes:
 *
 * 1. **Retrieval.** A `ki_retrieval` signal names the KI index it read in `data.target_index`, so
 *    it is attributed by matching that against `dest.value`. This is exact.
 * 2. **Fallback.** A `raw_access` signal is the `coverage_gap` case — the agent gave up on the KIs
 *    and read the underlying data — and names no KI index at all, so it cannot be matched
 *    directly. These are the most valuable signals for improving an index, so they are attributed
 *    two ways: by target, against the raw indices the AI index's own ES|QL sources read; and by
 *    conversation, against conversations already shown to involve this index in pass 1. The second
 *    is what `fell_back_to_raw` was recorded for.
 *
 * Every space is read. Signals are per-space because conversations are, but an AI index is global
 * and the pipeline it describes is global, so restricting to the caller's space would silently
 * analyze a fraction of the evidence and call it the whole picture.
 */
export const selectSignals = async (
  esClient: ElasticsearchClient,
  { destValue, sources, signalTimeRange, signalFilter, size, now }: SelectSignalsOptions
): Promise<SelectSignalsResult> => {
  const window = resolveSignalWindow(signalTimeRange, now);
  const baseFilter = buildBaseQuery({ ...window, signalFilter });

  const destMatch = buildTargetMatch(splitExpressions(destValue));
  const retrievalHits = destMatch
    ? await searchSignals({
        esClient,
        filter: [...baseFilter, { term: { 'data.query_kind': 'ki_retrieval' } }, destMatch],
        size,
      })
    : [];

  const conversationIds = [
    ...new Set(
      retrievalHits
        .map(({ signal }) => signal.data.conversation_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ].slice(0, MAX_COOCCURRENCE_CONVERSATIONS);

  const rawMatch = buildTargetMatch(rawIndexExpressionsFor(sources));
  const fallbackShould: QueryDslQueryContainer[] = [];
  if (rawMatch) {
    fallbackShould.push(rawMatch);
  }
  if (conversationIds.length > 0) {
    fallbackShould.push({ terms: { 'data.conversation_id': conversationIds } });
  }

  const fallbackHits =
    fallbackShould.length > 0
      ? await searchSignals({
          esClient,
          filter: [
            ...baseFilter,
            { term: { 'data.query_kind': 'raw_access' } },
            { bool: { should: fallbackShould, minimum_should_match: 1 } },
          ],
          size,
        })
      : [];

  const bySignalId = new Map<string, { signal: Signal; space?: string }>();
  for (const hit of [...retrievalHits, ...fallbackHits]) {
    bySignalId.set(hit.signal.signal_id, hit);
  }

  const merged = [...bySignalId.values()].sort((a, b) => {
    const byTime = b.signal['@timestamp'].localeCompare(a.signal['@timestamp']);
    return byTime !== 0 ? byTime : b.signal.signal_id.localeCompare(a.signal.signal_id);
  });

  const selected = merged.slice(0, size);
  const spaces = [
    ...new Set(
      selected.map(({ space }) => space).filter((space): space is string => space != null)
    ),
  ].sort();

  return { signals: selected.map(({ signal }) => signal), spaces, window };
};
