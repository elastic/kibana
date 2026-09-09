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
import type { Signal, SignalTag } from '../../common/http_api/signals';
import { SIGNAL_INDEX_PREFIX } from '../../common/http_api/signals';
import { parseFromClause } from '../tasks/transform';
import type { SignalPatternCandidate } from './group_signals';
import { resolveSignalWindow } from './window';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

/** The only `_source` fields an evidence hit needs; the rest of a signal is never read here. */
const EVIDENCE_SOURCE_INCLUDES = [
  'signal_id',
  'data.query',
  'data.error',
  'data.returned.row_count',
  'data.conversation_id',
] as const;

/** Cap on the conversations carried from the retrieval pass into the co-occurrence pass. */
const MAX_COOCCURRENCE_CONVERSATIONS = 1000;

/**
 * Cap on the (tag, target index, tool) combinations the pattern aggregation returns, ordered by
 * count. Ranking narrows this to `MAX_ANALYSIS_SIGNAL_GROUPS`, so this only has to be wide enough
 * that the ranking sees every group that could plausibly win.
 */
const MAX_PATTERN_BUCKETS = 300;

/** Cap on the per-space signal indices reported for one run. */
const MAX_SPACE_BUCKETS = 100;

export interface SelectSignalsOptions {
  /** The AI index's `dest.value`. */
  destValue: string;
  /** The AI index's sources. */
  sources: AiIndexSource[];
  signalTimeRange?: AiIndexSignalTimeRange;
  /** KQL from `feedback_analysis.signal_filter`, applied on top of the window. */
  signalFilter?: string;
  /** Current time, defaulting to the wall clock. */
  now?: Date;
}

export interface SelectSignalsResult {
  /** Every (tag, target index, tool) combination in the window, with its count. */
  patterns: SignalPatternCandidate[];
  /** Spaces the signals came from, derived from the indices the aggregation matched. */
  spaces: string[];
  /** How many signals were attributed to this index in the window. */
  signalCount: number;
  window: { from: string; to: string };
}

interface TermsBucket {
  key: string;
  doc_count: number;
}

/** The projection of a signal that `EVIDENCE_SOURCE_INCLUDES` returns. */
interface EvidenceSource {
  signal_id: string;
  data: {
    query?: string;
    error?: string;
    returned: { row_count: number };
    conversation_id?: string;
  };
}

/** A `multi_terms` bucket is keyed by the ordered tuple of its term values. */
interface PatternBucket {
  key: [SignalTag, string, string];
  doc_count: number;
  evidence: { hits: { hits: Array<{ _source?: EvidenceSource }> } };
}

interface PatternAggregations {
  spaces: { buckets: TermsBucket[] };
  patterns: { buckets: PatternBucket[] };
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

/** Matches `data.target_index` against a set of index expressions. */
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

/**
 * A `_index` bucket key is the backing index, not the write alias, so it carries the storage
 * adapter's generational suffix (`context-engine-signals-marketing-000001`).
 */
const spaceFromIndexName = (index: string | undefined): string | undefined => {
  if (!index || !index.startsWith(SIGNAL_INDEX_PREFIX)) {
    return undefined;
  }
  const spaceId = index.slice(SIGNAL_INDEX_PREFIX.length).replace(/-\d{6}$/, '');
  return spaceId.length > 0 ? spaceId : undefined;
};

/** Filters every selection shares: the window and the index's own KQL narrowing. */
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

const TOOL_CALL_CLAUSE: QueryDslQueryContainer = { term: { signal_type: 'tool_call' } };

const toExample = (signal: EvidenceSource): SignalPatternCandidate['example'] => ({
  ...(signal.data.query !== undefined ? { query: signal.data.query } : {}),
  ...(signal.data.error !== undefined ? { error: signal.data.error } : {}),
  row_count: signal.data.returned.row_count,
  ...(signal.data.conversation_id !== undefined
    ? { conversation_id: signal.data.conversation_id }
    : {}),
});

/**
 * Picks the signal a pattern is illustrated by. The hits arrive newest first, but recency is not
 * what makes an example useful: a failing query says more about a pattern than a successful one,
 * so an errored hit wins when the bucket has one.
 */
const toExampleFrom = (hits: EvidenceSource[]): SignalPatternCandidate['example'] | undefined => {
  const chosen = hits.find(({ data }) => data.error !== undefined) ?? hits[0];
  return chosen ? toExample(chosen) : undefined;
};

/** Turns the aggregation into one candidate per (tag, target index, tool). */
const buildPatterns = (aggregations: PatternAggregations | undefined): SignalPatternCandidate[] =>
  (aggregations?.patterns.buckets ?? []).map((bucket) => {
    const [tag, targetIndex, tool] = bucket.key;
    const hits = bucket.evidence.hits.hits
      .map((hit) => hit._source)
      .filter((source): source is EvidenceSource => source != null);
    const example = toExampleFrom(hits);

    return {
      tag,
      target_index: targetIndex,
      tool,
      count: bucket.doc_count,
      signal_ids: hits.map(({ signal_id: signalId }) => signalId),
      ...(example ? { example } : {}),
    };
  });

/** Selects the signals that describe one AI index's retrieval quality. */
export const selectSignals = async (
  esClient: ElasticsearchClient,
  { destValue, sources, signalTimeRange, signalFilter, now }: SelectSignalsOptions
): Promise<SelectSignalsResult> => {
  const window = resolveSignalWindow(signalTimeRange, now);
  const baseFilter = buildBaseQuery({ ...window, signalFilter });

  const destMatch = buildTargetMatch(splitExpressions(destValue));

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
    // Every pattern carries its own evidence, so no documents are read outside the aggregation.
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: baseFilter,
        should: attribution,
        minimum_should_match: 1,
      },
    },
    aggs: {
      spaces: { terms: { field: '_index', size: MAX_SPACE_BUCKETS } },
      patterns: {
        // A signal is bucketed once per tag it carries, so one tagged both `query_error` and
        // `coverage_gap` counts towards both patterns. Signals missing `data.target_index` or
        // `data.tool` form no pattern at all: the triple is the shape of a tool call, and
        // `signal_type: tool_call` is the only type that exists. A second signal type would need
        // its own pattern key rather than a `missing` placeholder here.
        multi_terms: {
          terms: [{ field: 'tags' }, { field: 'data.target_index' }, { field: 'data.tool' }],
          size: MAX_PATTERN_BUCKETS,
          order: { _count: 'desc' },
        },
        aggs: {
          // Evidence comes from inside the bucket, so a pattern cannot end up counted but
          // unillustrated. The `_source` projection keeps this to a handful of small fields per
          // hit, which is what makes it affordable across every bucket.
          evidence: {
            top_hits: {
              size: MAX_GROUP_SIGNAL_IDS,
              // Signals are written in trace batches and share timestamps, so `signal_id` breaks ties.
              sort: [{ '@timestamp': { order: 'desc' } }, { signal_id: { order: 'desc' } }],
              _source: { includes: [...EVIDENCE_SOURCE_INCLUDES] },
            },
          },
        },
      },
    },
  });

  return {
    patterns: buildPatterns(response.aggregations),
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
