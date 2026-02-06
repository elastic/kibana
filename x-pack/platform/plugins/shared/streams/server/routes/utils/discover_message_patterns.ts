/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { dateRangeQuery } from '@kbn/es-query';

export interface MessageCategory {
  pattern: string;
  sampleDocuments: Array<Record<string, unknown>>;
}

/**
 * Single source of truth for pattern_replace char_filters that normalize
 * variable data into placeholder tokens. Each entry produces:
 *   1. A char_filter in the categorization_analyzer (pattern → `__<name>__`)
 *   2. A placeholder name used to strip tokens when building exclusion queries
 *
 * Order matters: more specific patterns (e.g. UUID) should come before
 * broader ones (e.g. ID, NUM) to avoid premature replacement.
 */
const PLACEHOLDER_REPLACEMENTS = [
  { name: 'URL', pattern: 'https?://\\S+' },
  {
    name: 'UUID',
    pattern: '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b',
  },
  { name: 'ID', pattern: '\\b[0-9a-fA-F]{8,}\\b' },
  { name: 'IP', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b' },
  { name: 'EMAIL', pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b' },
  { name: 'TIMESTAMP', pattern: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}[.\\d]*Z?' },
  { name: 'HTTPMETHOD', pattern: '\\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\\b' },
  { name: 'NUM', pattern: '\\b\\d+\\b' },
] as const;

/**
 * Placeholder names derived from the replacement definitions.
 * The ml_standard tokenizer may strip the `__` delimiters, so the actual
 * tokens in categorize_text output can appear as any of:
 *   __URL__  |  __URL  |  URL__  |  URL
 *
 * The regex matches all four forms for each placeholder name.
 */
const PLACEHOLDER_NAMES = PLACEHOLDER_REPLACEMENTS.map(({ name }) => name);
const PLACEHOLDER_PATTERN = new RegExp(`\\b_?_?(?:${PLACEHOLDER_NAMES.join('|')})_?_?\\b`, 'g');

/**
 * Char_filter entries for the categorization_analyzer, built from
 * PLACEHOLDER_REPLACEMENTS so that adding a new placeholder automatically
 * creates the corresponding char_filter.
 */
const PLACEHOLDER_CHAR_FILTERS = PLACEHOLDER_REPLACEMENTS.map(
  ({ name, pattern: filterPattern }) =>
    ({
      type: 'pattern_replace' as const,
      pattern: filterPattern,
      replacement: `__${name}__`,
    } as unknown as string)
);

/**
 * Base slop added to every `match_phrase` exclusion query to tolerate minor
 * tokenization differences between `ml_standard` (categorization) and
 * `standard` (index-time analyzer).
 */
const BASE_SLOP = 2;

/**
 * Additional slop per stripped placeholder. Each placeholder can represent
 * multiple tokens in the original document (e.g. a URL may be many tokens),
 * so we allow extra positional slack for each one removed.
 */
const SLOP_PER_PLACEHOLDER = 3;

/**
 * Removes categorization placeholder tokens from a pattern, returning the
 * cleaned string and a count of removed placeholders. The count is used to
 * compute a dynamic `slop` value for `match_phrase` exclusion queries.
 */
export const stripPlaceholderTokensWithCount = (
  pattern: string
): { cleaned: string; placeholderCount: number } => {
  let placeholderCount = 0;
  const cleaned = pattern
    .replace(PLACEHOLDER_PATTERN, () => {
      placeholderCount++;
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { cleaned, placeholderCount };
};

/**
 * Minimum number of meaningful tokens a cleaned pattern must have to be useful
 * as an exclusion query. Patterns with fewer tokens (e.g. "request", "sent to")
 * are too generic and would over-exclude unrelated documents.
 */
const MIN_EXCLUSION_TOKENS = 3;

/** Sampling probability for the random_sampler aggregation (0..1). */
const SAMPLING_PROBABILITY = 0.1;

/** Minimum document count for a category to be returned by categorize_text. */
const MIN_DOC_COUNT = 10;

/** Maximum number of categories returned by categorize_text. */
const CATEGORIES_SIZE = 10;

/** Similarity threshold (0..100) for categorize_text to merge similar categories. */
const SIMILARITY_THRESHOLD = 70;

/** Minimum token length kept by the token length filter. */
const MIN_TOKEN_LENGTH = 3;

/** Number of sample documents returned per category via top_hits. */
const SAMPLE_DOCS_PER_CATEGORY = 2;

/**
 * Returns true if a pattern has enough meaningful tokens (after placeholder and
 * short-token removal) to be reliably used for exclusion in subsequent iterations.
 */
export const isPatternExcludable = (pattern: string): boolean => {
  const { cleaned } = stripPlaceholderTokensWithCount(pattern);
  return cleaned.split(/\s+/).length >= MIN_EXCLUSION_TOKENS;
};

/**
 * Runs a categorize_text aggregation on the message field to discover log patterns.
 * Accepts an optional list of patterns to exclude (from previous iterations).
 */
export const discoverMessagePatterns = async ({
  esClient,
  index,
  start,
  end,
  excludePatterns,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  excludePatterns?: string[];
}): Promise<MessageCategory[]> => {
  const mustNot: QueryDslQueryContainer[] = (excludePatterns ?? [])
    .map(stripPlaceholderTokensWithCount)
    .filter(({ cleaned }) => cleaned.length > 0)
    .map(({ cleaned, placeholderCount }) => ({
      match_phrase: {
        message: {
          query: cleaned,
          slop: BASE_SLOP + placeholderCount * SLOP_PER_PLACEHOLDER,
        },
      },
    }));

  const response = await esClient.search({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: dateRangeQuery(start, end),
        must_not: mustNot.length > 0 ? mustNot : undefined,
      },
    },
    aggregations: {
      sampler: {
        random_sampler: {
          probability: SAMPLING_PROBABILITY,
        },
        aggs: {
          message: {
            categorize_text: {
              field: 'message',
              min_doc_count: MIN_DOC_COUNT,
              size: CATEGORIES_SIZE,
              similarity_threshold: SIMILARITY_THRESHOLD,
              categorization_analyzer: {
                tokenizer: 'ml_standard',
                char_filter: [
                  {
                    type: 'pattern_replace' as const,
                    pattern: '\\\\n',
                    replacement: '',
                  } as unknown as string,
                  ...PLACEHOLDER_CHAR_FILTERS,
                ],
                filter: [
                  {
                    type: 'length' as const,
                    min: MIN_TOKEN_LENGTH,
                  } as unknown as string,
                ],
              },
            },
            aggs: {
              sample: {
                top_hits: {
                  size: SAMPLE_DOCS_PER_CATEGORY,
                  _source: true,
                  sort: { _score: { order: 'desc' as const } },
                },
              },
            },
          },
        },
      },
    },
  });

  const samplerAgg = response.aggregations?.sampler as
    | Record<string, { buckets: Array<Record<string, unknown>> }>
    | undefined;
  const buckets = samplerAgg?.message?.buckets ?? [];

  return buckets
    .map((bucket) => {
      const sampleAgg = bucket.sample as {
        hits: { hits: Array<{ _source: Record<string, unknown> }> };
      };

      return {
        pattern: bucket.key as string,
        sampleDocuments: sampleAgg.hits.hits.map((hit) => hit._source),
      };
    })
    .filter((category) => isPatternExcludable(category.pattern));
};
