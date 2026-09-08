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

const SIGNAL_SOURCE_EXCLUDES = ['data.returned.columns'] as const;

/** Cap on the conversations carried from the retrieval pass into the co-occurrence pass. */
const MAX_COOCCURRENCE_CONVERSATIONS = 1000;

/** Bucket caps for the pattern aggregation. */
const MAX_TAG_BUCKETS = 10;
const MAX_TARGET_INDEX_BUCKETS = 30;
const MAX_TOOL_BUCKETS = 5;

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
  /** Cap on the documents sampled for examples and provenance ids. */
  sampleSize: number;
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

const spaceFromIndexName = (index: string | undefined): string | undefined => {
  if (!index || !index.startsWith(SIGNAL_INDEX_PREFIX)) {
    return undefined;
  }
  const spaceId = index.slice(SIGNAL_INDEX_PREFIX.length);
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

/** Keys a pattern by the triple that defines it. */
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

/** Collects one example and a few signal ids per pattern from the sampled documents. */
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
      if (!entry.example || (!entry.example.error && signal.data.error)) {
        entry.example = toExample(signal);
      }
    }
  }

  return evidence;
};

/** Turns the aggregation into one candidate per (tag, target index, tool). */
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

/** Selects the signals that describe one AI index's retrieval quality. */
export const selectSignals = async (
  esClient: ElasticsearchClient,
  { destValue, sources, signalTimeRange, signalFilter, sampleSize, now }: SelectSignalsOptions
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
    size: sampleSize,
    track_total_hits: true,
    _source: { excludes: [...SIGNAL_SOURCE_EXCLUDES] },
    query: {
      bool: {
        filter: baseFilter,
        should: attribution,
        minimum_should_match: 1,
      },
    },
    // Signals are written in trace batches and share timestamps, so `signal_id` breaks ties.
    sort: [{ '@timestamp': { order: 'desc' } }, { signal_id: { order: 'desc' } }],
    aggs: {
      spaces: { terms: { field: '_index', size: MAX_SPACE_BUCKETS } },
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
