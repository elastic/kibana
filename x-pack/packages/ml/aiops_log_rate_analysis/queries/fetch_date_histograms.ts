/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type NumericChartData, type SignificantItem } from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { RANDOM_SAMPLER_SEED } from '../constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getHistogramQuery } from './get_histogram_query';

export const fetchDateHistograms = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  significantItem: SignificantItem,
  overallTimeSeries: NumericChartData,
  logger: Logger,
  // The default value of 1 means no sampling will be used
  randomSamplerProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) => {
  const histogramQuery = getHistogramQuery(params, [
    {
      term: { [significantItem.fieldName]: significantItem.fieldValue },
    },
  ]);

  const histogramAgg = {
    mini_histogram: {
      histogram: {
        field: params.timeFieldName,
        interval: overallTimeSeries.interval,
        min_doc_count: 0,
        extended_bounds: {
          min: params.start,
          max: params.end,
        },
      },
    },
  };

  const { wrap, unwrap } = createRandomSamplerWrapper({
    probability: randomSamplerProbability ?? 1,
    seed: RANDOM_SAMPLER_SEED,
  });

  const body = await esClient.search(
    {
      index: params.index,
      size: 0,
      body: {
        query: histogramQuery,
        aggs: wrap(histogramAgg),
        size: 0,
        // ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
      },
    },
    { signal: abortSignal, maxRetries: 0 }
  );

  const aggregations = unwrap(body.aggregations);

  const chartData = {
    data: aggregations.mini_histogram.buckets,
    interval: overallTimeSeries.interval,
    stats: overallTimeSeries.stats,
    type: 'numeric',
    id: significantItem.fieldName,
  } as NumericChartData;

  return chartData;
};
