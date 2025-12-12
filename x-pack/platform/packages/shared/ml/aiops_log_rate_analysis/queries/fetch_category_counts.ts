/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { RANDOM_SAMPLER_SEED } from '../constants';

import { getQueryWithParams } from './get_query_with_params';
import type { FetchCategoriesResponse } from './fetch_categories';

interface CategoryCountsBuckets {
  category_counts: {
    buckets: Record<string, estypes.AggregationsFiltersBucket>;
  };
}

export const getCategoryCountRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  categories: Category[],
  from: number | undefined,
  to: number | undefined,
  sampleProbability: number
): estypes.SearchRequest => {
  const { index } = params;

  const query = getQueryWithParams({
    // This will override the original start/end params if
    // the optional from/to args are provided.
    params: {
      ...params,
      ...(from ? { start: from } : {}),
      ...(to ? { end: to } : {}),
    },
  });

  const categoryFilters = categories.reduce<Record<string, estypes.QueryDslQueryContainer>>(
    (acc, category, i) => {
      acc[`category_${i}`] = getCategoryQuery(fieldName, [category]);
      return acc;
    },
    {}
  );

  const filtersAgg: Record<string, estypes.AggregationsAggregationContainer> = {
    category_counts: {
      filters: {
        filters: categoryFilters,
        other_bucket: false,
      },
    },
  };

  const { wrap } = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  return {
    index,
    query,
    size: 0,
    track_total_hits: false,
    aggs: wrap(filtersAgg),
  };
};

export const fetchCategoryCounts = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  categories: FetchCategoriesResponse,
  sampleProbability: number,
  from: number | undefined,
  to: number | undefined,
  logger?: Logger,
  emitError?: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<FetchCategoriesResponse> => {
  const updatedCategories = cloneDeep(categories);

  if (updatedCategories.categories.length === 0) {
    return updatedCategories;
  }

  const { unwrap } = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const request = getCategoryCountRequest(
    params,
    fieldName,
    updatedCategories.categories,
    from,
    to,
    sampleProbability
  );

  let response;

  try {
    response = await esClient.search(request, { signal: abortSignal, maxRetries: 0 });
  } catch (error) {
    if (!isRequestAbortedError(error)) {
      if (logger) {
        logger.error(
          `Failed to fetch category counts for field name "${fieldName}", got: \n${JSON.stringify(
            error,
            null,
            2
          )}`
        );
      }

      if (emitError) {
        emitError(`Failed to fetch category counts for field name "${fieldName}".`);
      }
    }
    return updatedCategories;
  }

  if (!response.aggregations) {
    logger?.error(`No aggregations in category counts response for field "${fieldName}".`);

    if (emitError) {
      emitError(`Failed to fetch category counts for field name "${fieldName}".`);
    }
    return updatedCategories;
  }

  const { category_counts: categoryCounts } = unwrap(
    response.aggregations
  ) as CategoryCountsBuckets;

  for (const [i, category] of updatedCategories.categories.entries()) {
    category.count = categoryCounts.buckets[`category_${i}`]?.doc_count ?? 0;
  }

  return updatedCategories;
};
