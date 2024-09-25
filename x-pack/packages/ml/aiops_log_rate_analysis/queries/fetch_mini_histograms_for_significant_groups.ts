/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  NumericChartData,
  SignificantItemGroup,
  SignificantItemGroupHistogram,
} from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { RANDOM_SAMPLER_SEED } from '../constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getGroupFilter } from './get_group_filter';
import { getHistogramQuery } from './get_histogram_query';
import {
  getMiniHistogramDataFromAggResponse,
  getMiniHistogramAgg,
  MINI_HISTOGRAM_AGG_PREFIX,
  type MiniHistogramAgg,
} from './mini_histogram_utils';

export const fetchMiniHistogramsForSignificantGroups = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  significantGroups: SignificantItemGroup[],
  overallTimeSeries: NumericChartData['data'],
  logger: Logger,
  // The default value of 1 means no sampling will be used
  randomSamplerProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<SignificantItemGroupHistogram[]> => {
  const histogramQuery = getHistogramQuery(params);

  const histogramAggs = significantGroups.reduce<
    Record<string, estypes.AggregationsAggregationContainer>
  >((aggs, significantGroup, index) => {
    aggs[`${MINI_HISTOGRAM_AGG_PREFIX}${index}`] = {
      filter: {
        bool: { filter: getGroupFilter(significantGroup) },
      },
      aggs: getMiniHistogramAgg(params),
    };

    return aggs;
  }, {});

  const { wrap, unwrap } = createRandomSamplerWrapper({
    probability: randomSamplerProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const resp = await esClient.search(
    {
      index: params.index,
      size: 0,
      body: {
        query: histogramQuery,
        aggs: wrap(histogramAggs),
        size: 0,
      },
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  if (resp.aggregations === undefined) {
    if (!isRequestAbortedError(resp)) {
      if (logger) {
        logger.error(
          `Failed to fetch the histogram data chunk, got: \n${JSON.stringify(resp, null, 2)}`
        );
      }

      if (emitError) {
        emitError(`Failed to fetch the histogram data chunk.`);
      }
    }
    return [];
  }

  const unwrappedResp = unwrap(resp.aggregations) as Record<string, MiniHistogramAgg>;

  return significantGroups.map((significantGroup, index) => ({
    id: significantGroup.id,
    histogram: getMiniHistogramDataFromAggResponse(overallTimeSeries, unwrappedResp, index),
  }));
};
