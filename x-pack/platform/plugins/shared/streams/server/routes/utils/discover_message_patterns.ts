/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  AggregationsAggregationContainer,
} from '@elastic/elasticsearch/lib/api/types';
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
 * Minimum-should-match spec for the `match` exclusion queries.
 *
 * `categorize_text` groups documents by fuzzy token similarity (controlled by
 * `SIMILARITY_THRESHOLD`), so a positional `match_phrase` is too strict —
 * category members can differ by up to 30 % of their tokens and still be
 * grouped together, and the `standard` index-time analyzer produces extra
 * tokens (short words, split punctuation) that `ml_standard` discards.
 *
 * A bag-of-words `match` query with `minimum_should_match` mirrors the
 * categorization semantics much more closely:
 *   • ≤ 3 query terms → all must appear (avoids over-excluding on tiny patterns)
 *   • > 3 query terms → 75 % must appear (slightly above the 70 % similarity
 *     threshold to reduce false positives)
 */
const EXCLUSION_MINIMUM_SHOULD_MATCH = '3<75%';

/**
 * Removes categorization placeholder tokens from a pattern and returns the
 * cleaned string. Used to build exclusion queries from the meaningful
 * (non-variable) parts of a categorize_text pattern.
 */
export const stripPlaceholderTokens = (pattern: string): string => {
  return pattern
    .replace(PLACEHOLDER_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Minimum number of meaningful tokens a cleaned pattern must have to be useful
 * as an exclusion query. Patterns with fewer tokens (e.g. "request", "sent to")
 * are too generic and would over-exclude unrelated documents.
 */
const MIN_EXCLUSION_TOKENS = 3;

/** Target number of documents for the adaptive random_sampler probability. */
const TARGET_SAMPLE_SIZE = 100_000;

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

/** Number of random documents returned as fallback when categorization yields no results. */
const RANDOM_SAMPLE_SIZE = CATEGORIES_SIZE * SAMPLE_DOCS_PER_CATEGORY;

/**
 * Candidate fields for categorize_text, in order of preference.
 * `body.text` is preferred (OTel native); `message` is the ECS standard
 * (and in Streams logs indices is often an alias for `body.text`).
 */
const CANDIDATE_FIELDS = ['body.text', 'message'] as const;

/**
 * Returns true if a pattern has enough meaningful tokens (after placeholder and
 * short-token removal) to be reliably used for exclusion in subsequent iterations.
 */
export const isMeaningfulPattern = (pattern: string): boolean => {
  const cleaned = stripPlaceholderTokens(pattern);
  return cleaned.split(/\s+/).filter((token) => token.length > 0).length >= MIN_EXCLUSION_TOKENS;
};

export interface DiscoverPatternsResult {
  categories: MessageCategory[];
  /** Random sample documents, used as fallback when categorization yields no results. */
  randomSampleDocuments: Array<Record<string, unknown>>;
  /** The text field used for categorize_text, or `undefined` if no suitable field was found. */
  categorizationField: string | undefined;
}

/**
 * Resolves which text field to use for categorize_text by checking
 * `fieldCaps` for the {@link CANDIDATE_FIELDS}. Returns the first
 * mapped field in preference order, or `undefined` if none are mapped.
 */
const resolveCategorizationField = async ({
  esClient,
  index,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
}): Promise<string | undefined> => {
  const fieldCapsResponse = await esClient.fieldCaps({
    fields: [...CANDIDATE_FIELDS],
    index,
    index_filter: {
      bool: { filter: dateRangeQuery(start, end) },
    },
    types: ['text', 'match_only_text'],
  });

  const mappedFields = Object.keys(fieldCapsResponse.fields);

  return CANDIDATE_FIELDS.find((field) => mappedFields.includes(field));
};

/**
 * Runs a categorize_text aggregation to discover log patterns, with automatic
 * field detection (supports both ECS `message` and OTel `body.text`).
 *
 * Always includes a random-sampling fallback: when categorization yields no
 * results (or no suitable text field is mapped), the caller can use
 * `randomSampleDocuments` instead.
 *
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
}): Promise<DiscoverPatternsResult> => {
  const categorizationField = await resolveCategorizationField({ esClient, index, start, end });

  const mustNot: QueryDslQueryContainer[] =
    categorizationField !== undefined
      ? (excludePatterns ?? [])
          .map(stripPlaceholderTokens)
          .filter((cleaned) => cleaned.length > 0)
          .map((cleaned) => ({
            match: {
              [categorizationField]: {
                query: cleaned,
                minimum_should_match: EXCLUSION_MINIMUM_SHOULD_MATCH,
              },
            },
          }))
      : [];

  const samplerSubAggs: Record<string, AggregationsAggregationContainer> = {
    random_docs: {
      top_hits: {
        size: RANDOM_SAMPLE_SIZE,
        _source: true,
      },
    },
  };

  if (categorizationField) {
    samplerSubAggs.categories = {
      categorize_text: {
        field: categorizationField,
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
    };
  }

  const countResponse = await esClient.count({
    index,
    query: {
      bool: {
        filter: dateRangeQuery(start, end),
        must_not: mustNot.length > 0 ? mustNot : undefined,
      },
    },
  });

  const rawProbability = TARGET_SAMPLE_SIZE / countResponse.count;
  const samplingProbability = rawProbability >= 0.5 ? 1 : rawProbability;

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
          probability: samplingProbability,
        },
        aggs: samplerSubAggs,
      },
    },
  });

  const samplerAgg = response.aggregations
    ? (response.aggregations.sampler as {
        categories?: {
          buckets: Array<{
            key: string;
            sample: { hits: { hits: { _source: Record<string, unknown> }[] } };
          }>;
        };
        random_docs: { hits: { hits: { _source: Record<string, unknown> }[] } };
      })
    : undefined;

  const categories =
    samplerAgg?.categories?.buckets
      .map((bucket) => ({
        pattern: bucket.key,
        sampleDocuments: bucket.sample.hits.hits.map((hit) => hit._source),
      }))
      .filter((category) => isMeaningfulPattern(category.pattern)) ?? [];

  const randomSampleDocuments = (samplerAgg?.random_docs?.hits.hits ?? []).map(
    (hit) => hit._source
  );

  return { categories, randomSampleDocuments, categorizationField };
};
