/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';

import type { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import type { Category, CategoriesAgg, CatResponse, Sparkline } from './types';

export function processCategoryResults(
  result: CatResponse,
  field: string,
  unwrap: ReturnType<typeof createRandomSamplerWrapper>['unwrap']
) {
  const { aggregations } = result.rawResponse;
  if (aggregations === undefined) {
    throw new Error('processCategoryResults failed, did not return aggregations.');
  }
  const {
    categories: { buckets },
  } = unwrap(
    aggregations as unknown as Record<string, estypes.AggregationsAggregate>
  ) as CategoriesAgg;

  const categories: Category[] = buckets.map((b) => {
    return {
      key: b.key,
      count: b.doc_count,
      examples: b.examples.hits.hits.map((h) => get(h._source, field)),
      sparkline: getSparkline(b.sparkline),
      subTimeRangeCount: b.sub_time_range?.buckets[0].doc_count ?? undefined,
      subFieldCount: b.sub_time_range?.buckets[0].sub_field?.doc_count ?? undefined,
      subFieldExamples:
        b.sub_time_range?.buckets[0].examples.hits.hits.map((h) => get(h._source, field)) ??
        undefined,
      subFieldSparkline: getSparkline(b.sub_time_range?.buckets[0].sparkline),
      regex: b.regex,
    };
  });

  // check the first category for examples to determine if examples are available
  const hasExamples = categories[0]?.examples.some((e) => e !== undefined);

  return {
    categories,
    hasExamples,
  };
}

function getSparkline(sparkline?: Sparkline) {
  return sparkline === undefined
    ? {}
    : sparkline.buckets.reduce<Record<number, number>>((acc, cur) => {
        acc[cur.key] = cur.doc_count;
        return acc;
      }, {});
}
