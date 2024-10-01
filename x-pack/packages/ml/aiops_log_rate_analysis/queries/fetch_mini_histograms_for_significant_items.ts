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
  SignificantItem,
  SignificantItemHistogram,
} from '@kbn/ml-agg-utils';
import { isSignificantItem } from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';

import { RANDOM_SAMPLER_SEED } from '../constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getHistogramQuery } from './get_histogram_query';
import {
  getMiniHistogramDataFromAggResponse,
  getMiniHistogramAgg,
  MINI_HISTOGRAM_AGG_PREFIX,
  type MiniHistogramAgg,
} from './mini_histogram_utils';

export const fetchMiniHistogramsForSignificantItems = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  significantItems: SignificantItem[],
  overallTimeSeries: NumericChartData['data'],
  logger: Logger,
  // The default value of 1 means no sampling will be used
  randomSamplerProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<SignificantItemHistogram[]> => {
  const histogramQuery = getHistogramQuery(params);

  const histogramAggs = significantItems.reduce<
    Record<string, estypes.AggregationsAggregationContainer>
  >((aggs, significantItem, index) => {
    let filter;

    if (isSignificantItem(significantItem) && significantItem.type === 'keyword') {
      filter = {
        term: { [significantItem.fieldName]: significantItem.fieldValue },
      };
    } else if (isSignificantItem(significantItem) && significantItem.type === 'log_pattern') {
      filter = getCategoryQuery(significantItem.fieldName, [
        {
          key: `${significantItem.key}`,
          count: significantItem.doc_count,
          examples: [],
          regex: '',
        },
      ]);
    } else {
      throw new Error('Invalid significant item type.');
    }

    aggs[`${MINI_HISTOGRAM_AGG_PREFIX}${index}`] = {
      filter,
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

  return significantItems.map((significantItem, index) => ({
    fieldName: significantItem.fieldName,
    fieldValue: significantItem.fieldValue,
    histogram: getMiniHistogramDataFromAggResponse(overallTimeSeries, unwrappedResp, index),
  }));
};
