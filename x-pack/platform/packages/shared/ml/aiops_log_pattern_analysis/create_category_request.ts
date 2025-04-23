/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object/src/is_populated_object';

import type { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { createDefaultQuery } from '@kbn/aiops-common/create_default_query';
import { categorizationAnalyzer } from './categorization_analyzer';

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
      query,
      aggs: wrap(aggs),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      size: 0,
    },
  };
}
