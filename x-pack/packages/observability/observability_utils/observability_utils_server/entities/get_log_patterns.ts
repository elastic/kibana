/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCategorizeTextAggregation,
  AggregationsDateHistogramAggregation,
  AggregationsMaxAggregation,
  AggregationsMinAggregation,
  AggregationsTopHitsAggregation,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { categorizationAnalyzer } from '@kbn/aiops-log-pattern-analysis';
import { ChangePointType } from '@kbn/es-types/src';
import { pValueToLabel } from '@kbn/observability-utils-common/ml/p_value_to_label';
import { partition } from 'lodash';
import { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';
import { kqlQuery } from '../es/queries/kql_query';
import { rangeQuery } from '../es/queries/range_query';

interface FieldPatternResultBase {
  field: string;
  count: number;
  pattern: string;
  regex: string;
  sample: string;
  firstOccurrence: string;
  lastOccurrence: string;
  highlight: Record<string, string[]>;
  metadata: Record<string, unknown[]>;
}

interface FieldPatternResultChanges {
  timeseries: Array<{ x: number; y: number }>;
  change: {
    significance: 'high' | 'medium' | 'low' | null;
    type: ChangePointType;
    change_point?: number;
    r_value?: number;
    trend?: string;
    p_value?: number;
  };
}

export type FieldPatternResult<TChanges extends boolean | undefined = undefined> =
  FieldPatternResultBase & (TChanges extends true ? FieldPatternResultChanges : {});

export type FieldPatternResultWithChanges = FieldPatternResult<true>;

interface CategorizeTextOptions {
  query: QueryDslQueryContainer;
  metadata: string[];
  esClient: ObservabilityElasticsearchClient;
  samplingProbability: number;
  fields: string[];
  index: string | string[];
  useMlStandardTokenizer: boolean;
  size: number;
  start: number;
  end: number;
}
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CategorizeTextSubAggregations = {
  sample: { top_hits: AggregationsTopHitsAggregation };
  minTimestamp: { min: AggregationsMinAggregation };
  maxTimestamp: { max: AggregationsMaxAggregation };
};

interface CategorizeTextAggregationResult {
  categorize_text: AggregationsCategorizeTextAggregation;
  aggs: CategorizeTextSubAggregations &
    (
      | {}
      | {
          timeseries: { date_histogram: AggregationsDateHistogramAggregation };
          changes: { change_point: { buckets_path: string } };
        }
    );
}

export async function runCategorizeTextAggregation<
  TChanges extends boolean | undefined = undefined
>(
  options: CategorizeTextOptions & { includeChanges?: TChanges }
): Promise<Array<FieldPatternResult<TChanges>>>;

export async function runCategorizeTextAggregation({
  esClient,
  fields,
  metadata,
  index,
  query,
  samplingProbability,
  useMlStandardTokenizer,
  includeChanges,
  size,
  start,
  end,
}: CategorizeTextOptions & { includeChanges?: boolean }): Promise<
  Array<FieldPatternResult<boolean>>
> {
  const aggs = Object.fromEntries(
    fields.map((field): [string, CategorizeTextAggregationResult] => [
      field,
      {
        categorize_text: {
          field,
          min_doc_count: 1,
          size,
          categorization_analyzer: useMlStandardTokenizer
            ? {
                tokenizer: 'ml_standard',
                char_filter: [
                  {
                    type: 'pattern_replace',
                    pattern: '\\\\n',
                    replacement: '',
                  } as unknown as string,
                ],
              }
            : categorizationAnalyzer,
        },
        aggs: {
          minTimestamp: {
            min: {
              field: '@timestamp',
            },
          },
          maxTimestamp: {
            max: {
              field: '@timestamp',
            },
          },
          ...(includeChanges
            ? {
                timeseries: {
                  date_histogram: {
                    field: '@timestamp',
                    min_doc_count: 0,
                    extended_bounds: {
                      min: start,
                      max: end,
                    },
                    fixed_interval: `${Math.round((end - start) / 50)}ms`,
                  },
                },
                changes: {
                  change_point: {
                    buckets_path: 'timeseries>_count',
                  },
                },
              }
            : {}),
          sample: {
            top_hits: {
              size: 1,
              _source: false,
              fields: [field, ...metadata],
              sort: {
                _score: {
                  order: 'desc',
                },
              },
              highlight: {
                fields: {
                  '*': {},
                },
              },
            },
          },
        },
      },
    ])
  );

  const response = await esClient.search('get_log_patterns', {
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [query, ...rangeQuery(start, end)],
      },
    },
    aggs,
    // until https://github.com/elastic/elasticsearch/issues/110134 is fixed,
    // we cannot use random sampling
    // aggregations: {
    //   sampler: {
    //     random_sampler: {
    //       probability: samplingProbability,
    //     },
    //     aggs,
    //   },
    // },
  });

  if (!response.aggregations) {
    return [];
  }

  const fieldAggregates = response.aggregations;

  return Object.entries(fieldAggregates).flatMap(([fieldName, aggregate]) => {
    const buckets = aggregate.buckets;

    return buckets.map((bucket) => {
      return {
        field: fieldName,
        count: bucket.doc_count,
        pattern: bucket.key,
        regex: bucket.regex,
        sample: bucket.sample.hits.hits[0].fields![fieldName][0] as string,
        highlight: bucket.sample.hits.hits[0].highlight ?? {},
        metadata: bucket.sample.hits.hits[0].fields!,
        firstOccurrence: new Date(bucket.minTimestamp.value!).toISOString(),
        lastOccurrence: new Date(bucket.maxTimestamp.value!).toISOString(),
        ...('timeseries' in bucket
          ? {
              timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
                x: dateBucket.key,
                y: dateBucket.doc_count,
              })),
              change: Object.entries(bucket.changes.type).map(([changePointType, change]) => {
                return {
                  key: bucket.changes.bucket?.key,
                  type: changePointType,
                  significance: change.p_value !== undefined ? pValueToLabel(change.p_value) : null,
                  ...change,
                };
              })[0],
            }
          : {}),
      };
    });
  });
}

interface LogPatternOptions {
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
  index: string | string[];
  kuery: string;
  metadata?: string[];
  fields: string[];
}

export async function getLogPatterns<TChanges extends boolean | undefined = undefined>(
  options: LogPatternOptions & { includeChanges?: TChanges }
): Promise<Array<FieldPatternResult<TChanges>>>;

export async function getLogPatterns({
  esClient,
  start,
  end,
  index,
  kuery,
  includeChanges,
  metadata = [],
  fields,
}: LogPatternOptions & { includeChanges?: boolean }): Promise<Array<FieldPatternResult<boolean>>> {
  const fieldCapsResponse = await esClient.fieldCaps('get_field_caps_for_log_pattern_analysis', {
    fields,
    index_filter: {
      bool: {
        filter: [...rangeQuery(start, end)],
      },
    },
    index,
    types: ['text', 'match_only_text'],
  });

  const fieldsInFieldCaps = Object.keys(fieldCapsResponse.fields);

  if (!fieldsInFieldCaps.length) {
    return [];
  }

  const totalDocsResponse = await esClient.search('get_total_docs_for_log_pattern_analysis', {
    index,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [...kqlQuery(kuery), ...rangeQuery(start, end)],
      },
    },
  });

  const totalHits = totalDocsResponse.hits.total.value;

  if (totalHits === 0) {
    return [];
  }

  let samplingProbability = 100_000 / totalHits;

  if (samplingProbability >= 0.5) {
    samplingProbability = 1;
  }

  const fieldGroups = includeChanges
    ? fieldsInFieldCaps.map((field) => [field])
    : [fieldsInFieldCaps];

  const allPatterns = await Promise.all(
    fieldGroups.map(async (fieldGroup) => {
      const topMessagePatterns = await runCategorizeTextAggregation({
        esClient,
        index,
        fields: fieldGroup,
        query: {
          bool: {
            filter: kqlQuery(kuery),
          },
        },
        samplingProbability,
        useMlStandardTokenizer: false,
        size: 50,
        start,
        end,
        includeChanges,
        metadata,
      });

      if (topMessagePatterns.length === 0) {
        return [];
      }

      const [patternsToExclude, _] = partition(topMessagePatterns, (pattern) => {
        const complexity = pattern.regex.match(/(\.\+\?)|(\.\*\?)/g)?.length ?? 0;
        // elasticsearch will barf because the query is too complex
        return (
          complexity <= 25 &&
          // anything less than 100 messages should be re-processed with the ml_standard tokenizer
          pattern.count > 100
        );
      });

      const rareMessagePatterns = await runCategorizeTextAggregation({
        esClient,
        index,
        fields: fieldGroup,
        start,
        end,
        query: {
          bool: {
            filter: kqlQuery(kuery),
            must_not: [
              ...patternsToExclude.flatMap((pattern) => {
                return [
                  {
                    regexp: {
                      [pattern.field]: {
                        value: pattern.regex,
                      },
                    },
                  },
                ];
              }),
            ],
          },
        },
        size: 1000,
        includeChanges,
        samplingProbability: 1,
        useMlStandardTokenizer: true,
        metadata,
      });

      return [...patternsToExclude, ...rareMessagePatterns];
    })
  );

  return allPatterns.flat();
}
