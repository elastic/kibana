/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { MAX_GROUP_SIGNAL_IDS } from '../../common/constants';
import type { AiIndexSignalTimeRange, AiIndexSource } from '../../common/http_api/ai_indices';
import type { Signal } from '../../common/http_api/signals';
import { SIGNAL_INDEX_PREFIX } from '../../common/http_api/signals';
import { parseFromClause } from '../tasks/transform';
import type { SignalPatternCandidate } from './group_signals';
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

/**
 * Bucket caps for the pattern aggregation. A `terms` aggregation returns its top buckets by
 * document count, so a tail longer than these is dropped — but the tail is by definition the
 * rarest combinations, which rank last anyway. They are set well above what a healthy index
 * produces (three tags, a handful of tools) so the cut only bites on pathological cardinality.
 */
const MAX_TAG_BUCKETS = 10;
const MAX_TARGET_INDEX_BUCKETS = 30;
const MAX_TOOL_BUCKETS = 5;

/** Cap on the per-space signal indices reported for one run. */
const MAX_SPACE_BUCKETS = 100;

export interface SelectSignalsOptions {
  /** The AI index's `dest.value` — the authoritative locator for where its KIs live. */
  destValue: string;
  /** The AI index's sources; the ES|QL ones name the raw indices a fallback would read. */
  sources: AiIndexSource[];
  signalTimeRange?: AiIndexSignalTimeRange;
  /** KQL from `feedback_analysis.signal_filter`, applied on top of the window. */
  signalFilter?: string;
  /** Cap on the documents sampled for examples and provenance ids. Counts do not depend on it. */
  sampleSize: number;
  /** Injectable for tests; defaults to the wall clock. */
  now?: Date;
}

export interface SelectSignalsResult {
  /** Every (tag, target index, tool) combination in the window, with its true count. */
  patterns: SignalPatternCandidate[];
  /** Spaces the signals came from, derived from the indices the aggregation matched. */
  spaces: string[];
  /** How many signals were attributed to this index in the window — the true total. */
  signalCount: number;
  window: { from: string; to: string };
}

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface PatternAggregations {
  spaces: { buckets: TermsBucket[] };
  patterns: {
    buckets: Array<
      TermsBucket & {
        targets: {
          buckets: Array<TermsBucket & { tools: { buckets: TermsBucket[] } }>;
        };
      }
    >;
  };
}

interface ConversationAggregations {
  conversations: { buckets: TermsBucket[] };
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
 * Filters every selection shares: the window and the index's own KQL narrowing.
 *
 * Deliberately not restricted by `signal_type` — a run analyzes everything the window and the
 * index's filter admit. What a signal type means for *attribution* is handled below, because that
 * is where the type actually matters.
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
  const filters: QueryDslQueryContainer[] = [{ range: { '@timestamp': { gte: from, lte: to } } }];

  if (signalFilter) {
    filters.push(toElasticsearchQuery(fromKueryExpression(signalFilter)));
  }

  return filters;
};

/**
 * Management-agent signals describe Context Engine's own tooling rather than an agent failing to
 * find context — `classify` already leaves them untagged, so including them would only pad the
 * sample. Signals with no `data.agent.class` at all are unaffected.
 */
const MANAGEMENT_AGENT_CLAUSE: QueryDslQueryContainer = {
  term: { 'data.agent.class': 'management' },
};

const TOOL_CALL_CLAUSE: QueryDslQueryContainer = { term: { signal_type: 'tool_call' } };

/** Keys a pattern by the triple that defines it, so aggregation buckets and sampled docs meet. */
const PATTERN_KEY_SEPARATOR = '\u0000';
const patternKey = (tag: string, targetIndex: string, tool: string): string =>
  [tag, targetIndex, tool].join(PATTERN_KEY_SEPARATOR);

type PatternEvidence = Pick<SignalPatternCandidate, 'example' | 'signal_ids'>;

const toExample = (signal: Signal): SignalPatternCandidate['example'] => ({
  ...(signal.data.query !== undefined ? { query: signal.data.query } : {}),
  ...(signal.data.error !== undefined ? { error: signal.data.error } : {}),
  row_count: signal.data.returned.row_count,
  ...(signal.data.conversation_id !== undefined
    ? { conversation_id: signal.data.conversation_id }
    : {}),
});

/**
 * Collects one example and a few signal ids per pattern from the sampled documents.
 *
 * The sample is the most recent `sampleSize` signals, so a pattern occurring only outside it gets
 * its count from the aggregation but no example. That is the right trade: the count is what the
 * ranking reads, and a pattern rare enough to miss the sample ranks last anyway.
 *
 * Keyed exactly as the aggregation buckets are, so the two meet. When a second signal type is
 * added, `Signal` becomes a union and the `data` accesses below stop compiling — the intended
 * prompt to decide how that type keys, rather than having it quietly contribute nothing.
 */
const collectEvidence = (signals: Signal[], maxIds: number): Map<string, PatternEvidence> => {
  const evidence = new Map<string, PatternEvidence>();

  for (const signal of signals) {
    for (const tag of signal.tags) {
      const key = patternKey(tag, signal.data.target_index, signal.data.tool);
      let entry = evidence.get(key);
      if (!entry) {
        entry = { signal_ids: [] };
        evidence.set(key, entry);
      }

      if (entry.signal_ids.length < maxIds) {
        entry.signal_ids.push(signal.signal_id);
      }
      // Prefer an example that carries an error message: for a `query_error` pattern the message
      // is the finding, and the most recent signal in the pattern may not have one.
      if (!entry.example || (!entry.example.error && signal.data.error)) {
        entry.example = toExample(signal);
      }
    }
  }

  return evidence;
};

/**
 * Turns the aggregation into one candidate per (tag, target index, tool), taking the count from
 * the bucket and the example and ids from the sampled hits.
 */
const buildPatterns = (
  aggregations: PatternAggregations | undefined,
  sampled: Signal[]
): SignalPatternCandidate[] => {
  const evidence = collectEvidence(sampled, MAX_GROUP_SIGNAL_IDS);
  const patterns: SignalPatternCandidate[] = [];

  for (const tagBucket of aggregations?.patterns.buckets ?? []) {
    for (const targetBucket of tagBucket.targets.buckets) {
      for (const toolBucket of targetBucket.tools.buckets) {
        const found = evidence.get(patternKey(tagBucket.key, targetBucket.key, toolBucket.key));
        patterns.push({
          tag: tagBucket.key,
          target_index: targetBucket.key,
          tool: toolBucket.key,
          count: toolBucket.doc_count,
          signal_ids: found?.signal_ids ?? [],
          ...(found?.example ? { example: found.example } : {}),
        });
      }
    }
  }

  return patterns;
};

/**
 * Selects the signals that describe one AI index's retrieval quality.
 *
 * Signals are index-agnostic — they record that an agent ran a query, not which AI index the query
 * was meant to serve — so attribution is the whole problem. A signal is admitted by any of three
 * paths:
 *
 * 1. **Retrieval.** A `ki_retrieval` tool call names the KI index it read in `data.target_index`,
 *    so it is attributed by matching that against `dest.value`. This is exact.
 * 2. **Fallback.** A `raw_access` tool call is the `coverage_gap` case — the agent gave up on the
 *    KIs and read the underlying data — and names no KI index at all, so it cannot be matched
 *    directly. These are the most valuable signals for improving an index, so they are attributed
 *    two ways: by target, against the raw indices the AI index's own ES|QL sources read; and by
 *    conversation, against conversations already shown to involve this index in pass 1. The second
 *    is what `fell_back_to_raw` was recorded for.
 * 3. **Everything else.** A signal that is not a tool call has no `query_kind` or `target_index` to
 *    attribute on, so the window and the index's `signal_filter` are what scope it. Inert until a
 *    second signal type exists; it is here so adding one does not require the run to be taught
 *    about it first.
 *
 * Counts come from aggregations over the whole window rather than from the sampled documents, so
 * ranking reflects what actually happened rather than what fitted in one page of hits.
 *
 * Every space is read. Signals are per-space because conversations are, but an AI index is global
 * and the pipeline it describes is global, so restricting to the caller's space would silently
 * analyze a fraction of the evidence and call it the whole picture.
 */
export const selectSignals = async (
  esClient: ElasticsearchClient,
  { destValue, sources, signalTimeRange, signalFilter, sampleSize, now }: SelectSignalsOptions
): Promise<SelectSignalsResult> => {
  const window = resolveSignalWindow(signalTimeRange, now);
  const baseFilter = buildBaseQuery({ ...window, signalFilter });

  const destMatch = buildTargetMatch(splitExpressions(destValue));

  // Pass 1 runs on its own because pass 2 needs its conversations. Reading them as an aggregation
  // rather than off sampled documents means the co-occurrence pass sees every conversation in the
  // window, not only those in the most recent page of retrievals.
  const conversationIds = destMatch
    ? (
        await esClient.search<Signal, ConversationAggregations>({
          index: `${SIGNAL_INDEX_PREFIX}*`,
          ...LENIENT_INDEX_OPTIONS,
          size: 0,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                ...baseFilter,
                TOOL_CALL_CLAUSE,
                { term: { 'data.query_kind': 'ki_retrieval' } },
                destMatch,
              ],
              must_not: [MANAGEMENT_AGENT_CLAUSE],
            },
          },
          aggs: {
            conversations: {
              terms: { field: 'data.conversation_id', size: MAX_COOCCURRENCE_CONVERSATIONS },
            },
          },
        })
      ).aggregations?.conversations.buckets.map(({ key }) => key) ?? []
    : [];

  const rawMatch = buildTargetMatch(rawIndexExpressionsFor(sources));
  const fallbackShould: QueryDslQueryContainer[] = [];
  if (rawMatch) {
    fallbackShould.push(rawMatch);
  }
  if (conversationIds.length > 0) {
    fallbackShould.push({ terms: { 'data.conversation_id': conversationIds } });
  }

  const attribution: QueryDslQueryContainer[] = [];
  if (destMatch) {
    attribution.push({
      bool: {
        filter: [TOOL_CALL_CLAUSE, { term: { 'data.query_kind': 'ki_retrieval' } }, destMatch],
      },
    });
  }
  if (fallbackShould.length > 0) {
    attribution.push({
      bool: {
        filter: [
          TOOL_CALL_CLAUSE,
          { term: { 'data.query_kind': 'raw_access' } },
          { bool: { should: fallbackShould, minimum_should_match: 1 } },
        ],
      },
    });
  }
  attribution.push({ bool: { must_not: [TOOL_CALL_CLAUSE] } });

  const response = await esClient.search<Signal, PatternAggregations>({
    index: `${SIGNAL_INDEX_PREFIX}*`,
    ...LENIENT_INDEX_OPTIONS,
    // The hits are only ever the sample behind each pattern's example and ids; the counts, the
    // spaces and the total all come from below.
    size: sampleSize,
    track_total_hits: true,
    _source: { excludes: [...SIGNAL_SOURCE_EXCLUDES] },
    query: {
      bool: {
        filter: baseFilter,
        should: attribution,
        minimum_should_match: 1,
        must_not: [MANAGEMENT_AGENT_CLAUSE],
      },
    },
    // `signal_id` breaks ties: signals are written in trace batches and share timestamps freely,
    // so without it the sample taken at `sampleSize` would vary between two identical runs.
    sort: [{ '@timestamp': { order: 'desc' } }, { signal_id: { order: 'desc' } }],
    aggs: {
      spaces: { terms: { field: '_index', size: MAX_SPACE_BUCKETS } },
      // Bucketing on the multi-valued `tags` gives the fan-out and the exclusion for free: a
      // signal tagged twice counts in both patterns, and an untagged one — a retrieval that
      // worked — produces no bucket at all.
      //
      // A signal carrying no `data.target_index` or `data.tool` likewise produces no bucket, so a
      // signal type that is not a tool call reaches the run's total but forms no pattern. There is
      // deliberately no `missing` placeholder standing in for those: a placeholder would invent a
      // pattern keyed on fields the signal does not have, and how a second signal type should key
      // is a decision for whoever adds one.
      patterns: {
        terms: { field: 'tags', size: MAX_TAG_BUCKETS },
        aggs: {
          targets: {
            terms: { field: 'data.target_index', size: MAX_TARGET_INDEX_BUCKETS },
            aggs: { tools: { terms: { field: 'data.tool', size: MAX_TOOL_BUCKETS } } },
          },
        },
      },
    },
  });

  return {
    patterns: buildPatterns(
      response.aggregations,
      response.hits.hits
        .map((hit) => hit._source)
        .filter((source): source is Signal => source != null)
    ),
    spaces: [
      ...new Set(
        (response.aggregations?.spaces.buckets ?? [])
          .map(({ key }) => spaceFromIndexName(key))
          .filter((space): space is string => space != null)
      ),
    ].sort(),
    signalCount:
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0,
    window,
  };
};
