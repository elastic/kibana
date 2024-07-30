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
  SignificantItemHistogramItem,
} from '@kbn/ml-agg-utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { RANDOM_SAMPLER_SEED } from '../constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getGroupFilter } from './get_group_filter';
import { getHistogramQuery } from './get_histogram_query';

interface Aggs extends estypes.AggregationsSingleBucketAggregateBase {
  doc_count: number;
  mini_histogram: {
    buckets: Array<
      estypes.AggregationsSingleBucketAggregateBase & estypes.AggregationsHistogramBucketKeys
    >;
  };
}

const HISTOGRAM_AGG_PREFIX = 'histogram_';

export const fetchMiniHistogramsForSignificantGroups = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  significantGroups: SignificantItemGroup[],
  overallTimeSeries: NumericChartData,
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
    const filter = {
      bool: { filter: getGroupFilter(significantGroup) },
    };

    aggs[`${HISTOGRAM_AGG_PREFIX}${index}`] = {
      filter,
      aggs: {
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
      },
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

  const unwrappedResp = unwrap(resp.aggregations) as Record<string, Aggs>;

  return significantGroups.map((significantGroup, index) => {
    const histogram: SignificantItemHistogramItem[] =
      overallTimeSeries.data.map((o) => {
        const current = unwrappedResp[
          `${HISTOGRAM_AGG_PREFIX}${index}`
        ].mini_histogram.buckets.find((d1) => d1.key_as_string === o.key_as_string) ?? {
          doc_count: 0,
        };

        return {
          key: o.key,
          key_as_string: o.key_as_string ?? '',
          doc_count_significant_item: current.doc_count,
          doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
        };
      }) ?? [];

    return {
      id: significantGroup.id,
      histogram,
    };
  });
};
