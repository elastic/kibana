/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  AggregationsCustomCategorizeTextAnalyzer,
} from '@elastic/elasticsearch/lib/api/types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object/src/is_populated_object';

import type { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { createDefaultQuery } from '@kbn/aiops-common/create_default_query';

const CATEGORY_LIMIT = 1000;
const EXAMPLE_LIMIT = 4;

export interface CategorizationAdditionalFilter {
  from: number;
  to: number;
  field?: { name: string; value: string };
}

export function createCategoryRequest(
  index: string,
  field: string,
  timeField: string,
  timeRange: { from: number; to: number } | undefined,
  queryIn: QueryDslQueryContainer,
  runtimeMappings: MappingRuntimeFields | undefined,
  wrap: ReturnType<typeof createRandomSamplerWrapper>['wrap'],
  intervalMs?: number,
  additionalFilter?: CategorizationAdditionalFilter,
  useStandardTokenizer: boolean = true,
  includeSparkline: boolean = true
) {
  const query = createDefaultQuery(queryIn, timeField, timeRange);
  const aggs = {
    categories: {
      categorize_text: {
        field,
        size: CATEGORY_LIMIT,
        ...(useStandardTokenizer ? { categorization_analyzer: categorizationAnalyzer } : {}),
      },
      aggs: {
        examples: {
          top_hits: {
            size: EXAMPLE_LIMIT,
            sort: [timeField],
            _source: field,
          },
        },
        ...(intervalMs && includeSparkline
          ? {
              sparkline: {
                date_histogram: {
                  field: timeField,
                  fixed_interval: `${intervalMs}ms`,
                },
              },
            }
          : {}),
        ...(additionalFilter
          ? {
              sub_time_range: {
                date_range: {
                  field: timeField,
                  format: 'epoch_millis',
                  ranges: [{ from: additionalFilter.from, to: additionalFilter.to }],
                },
                aggs: {
                  examples: {
                    top_hits: {
                      size: EXAMPLE_LIMIT,
                      sort: [timeField],
                      _source: field,
                    },
                  },
                  ...(intervalMs
                    ? {
                        sparkline: {
                          date_histogram: {
                            field: timeField,
                            fixed_interval: `${intervalMs}ms`,
                          },
                        },
                      }
                    : {}),
                  ...(additionalFilter.field
                    ? {
                        sub_field: {
                          filter: {
                            term: {
                              [additionalFilter.field.name]: additionalFilter.field.value,
                            },
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
    },
  };

  return {
    params: {
      index,
      body: {
        query,
        aggs: wrap(aggs),
        ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
        size: 0,
      },
    },
  };
}

// This is a copy of the default categorization analyzer but using the 'standard' tokenizer rather than the 'ml_standard' tokenizer.
// The 'ml_standard' tokenizer splits tokens in a way that was observed to give better categories in testing many years ago, however,
// the downside of these better categories is then a potential failure to match the original documents when creating a filter for Discover.
// A future enhancement would be to check which analyzer is specified in the mappings for the source field and to use
// that instead of unconditionally using 'standard'.
// However for an initial fix, using the standard analyzer will be more likely to match the results from the majority of searches.
const categorizationAnalyzer: AggregationsCustomCategorizeTextAnalyzer = {
  char_filter: ['first_line_with_letters'],
  tokenizer: 'standard',
  filter: [
    // @ts-expect-error filter type in AggregationsCustomCategorizeTextAnalyzer is incorrect
    {
      type: 'stop',
      stopwords: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
        'GMT',
        'UTC',
      ],
    },
    // @ts-expect-error filter type in AggregationsCustomCategorizeTextAnalyzer is incorrect
    {
      type: 'limit',
      max_token_count: '100',
    },
  ],
};
