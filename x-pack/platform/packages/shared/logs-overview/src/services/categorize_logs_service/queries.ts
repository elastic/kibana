/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCategorizeTextAnalyzer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { calculateAuto } from '@kbn/calculate-auto';
import { RandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import moment from 'moment';

const isoTimestampFormat = "YYYY-MM-DD'T'HH:mm:ss.SSS'Z'";

export const createCategorizationQuery = ({
  messageField,
  timeField,
  startTimestamp,
  endTimestamp,
  additionalFilters = [],
  ignoredCategoryTerms = [],
}: {
  messageField: string;
  timeField: string;
  startTimestamp: string;
  endTimestamp: string;
  additionalFilters?: QueryDslQueryContainer[];
  ignoredCategoryTerms?: string[];
}): QueryDslQueryContainer => {
  return {
    bool: {
      filter: [
        {
          exists: {
            field: messageField,
          },
        },
        {
          range: {
            [timeField]: {
              gte: startTimestamp,
              lte: endTimestamp,
              format: 'strict_date_time',
            },
          },
        },
        ...additionalFilters,
      ],
      must_not: ignoredCategoryTerms.map(createCategoryQuery(messageField)),
    },
  };
};

export const createCategorizationRequestParams = ({
  index,
  timeField,
  messageField,
  startTimestamp,
  endTimestamp,
  randomSampler,
  minDocsPerCategory = 0,
  additionalFilters = [],
  ignoredCategoryTerms = [],
  maxCategoriesCount = 1000,
}: {
  startTimestamp: string;
  endTimestamp: string;
  index: string;
  timeField: string;
  messageField: string;
  randomSampler: RandomSamplerWrapper;
  minDocsPerCategory?: number;
  additionalFilters?: QueryDslQueryContainer[];
  ignoredCategoryTerms?: string[];
  maxCategoriesCount?: number;
}) => {
  const startMoment = moment(startTimestamp, isoTimestampFormat);
  const endMoment = moment(endTimestamp, isoTimestampFormat);
  const fixedIntervalDuration = calculateAuto.atLeast(
    24,
    moment.duration(endMoment.diff(startMoment))
  );
  const fixedIntervalSize = `${Math.ceil(fixedIntervalDuration?.asMinutes() ?? 1)}m`;

  return {
    index,
    size: 0,
    track_total_hits: false,
    query: createCategorizationQuery({
      messageField,
      timeField,
      startTimestamp,
      endTimestamp,
      additionalFilters,
      ignoredCategoryTerms,
    }),
    aggs: randomSampler.wrap({
      histogram: {
        date_histogram: {
          field: timeField,
          fixed_interval: fixedIntervalSize,
          extended_bounds: {
            min: startTimestamp,
            max: endTimestamp,
          },
        },
      },
      categories: {
        categorize_text: {
          field: messageField,
          size: maxCategoriesCount,
          categorization_analyzer: categorizationAnalyzerConfig,
          ...(minDocsPerCategory > 0 ? { min_doc_count: minDocsPerCategory } : {}),
        },
        aggs: {
          histogram: {
            date_histogram: {
              field: timeField,
              fixed_interval: fixedIntervalSize,
              extended_bounds: {
                min: startTimestamp,
                max: endTimestamp,
              },
            },
          },
          change: {
            // @ts-expect-error the official types don't support the change_point aggregation
            change_point: {
              buckets_path: 'histogram>_count',
            },
          },
        },
      },
    }),
  };
};

export const createCategoryQuery =
  (messageField: string) =>
  (categoryTerms: string): QueryDslQueryContainer => ({
    match: {
      [messageField]: {
        query: categoryTerms,
        operator: 'AND' as const,
        fuzziness: 0,
        auto_generate_synonyms_phrase_query: false,
      },
    },
  });

// This emulates the behavior of the `ml_standard` tokenizer in the ML plugin in
// regard to the hexadecimal and numeric tokens. The other parts pertaining to
// infix punctuation and file paths are not easily emulated this way.
// https://github.com/elastic/elasticsearch/blob/becd08da24df2af93eee28053d32929298cdccbd/x-pack/plugin/ml/src/main/java/org/elasticsearch/xpack/ml/job/categorization/MlStandardTokenizer.java#L35-L146
// We don't use the `ml_standard` tokenizer directly because it produces tokens
// that are different from the ones produced by the `standard` tokenizer upon
// indexing.
const categorizationAnalyzerConfig: AggregationsCategorizeTextAnalyzer = {
  tokenizer: 'standard',
  char_filter: [
    'first_line_with_letters',
    // This ignores tokens that are hexadecimal numbers
    // @ts-expect-error the official types don't support inline char filters
    {
      type: 'pattern_replace',
      pattern: '\\b[a-fA-F][a-fA-F0-9]+\\b',
      replacement: '',
    },
    // This ignore tokens that start with a digit
    // @ts-expect-error the official types don't support inline char filters
    {
      type: 'pattern_replace',
      pattern: '\\b\\d\\w*\\b',
      replacement: '',
    },
  ],
  filter: [
    // @ts-expect-error the official types don't support inline token filters
    {
      type: 'limit',
      max_token_count: '100',
    },
  ],
};
