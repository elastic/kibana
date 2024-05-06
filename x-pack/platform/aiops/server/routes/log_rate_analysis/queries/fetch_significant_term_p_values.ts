/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniqBy } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Logger } from '@kbn/logging';
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import {
  createRandomSamplerWrapper,
  type RandomSamplerWrapper,
} from '@kbn/ml-random-sampler-utils';

import { LOG_RATE_ANALYSIS_SETTINGS, RANDOM_SAMPLER_SEED } from '../../../../common/constants';
import type { AiopsLogRateAnalysisSchema } from '../../../../common/api/log_rate_analysis/schema';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { getNormalizedScore } from './get_normalized_score';
import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

// TODO Consolidate with duplicate `fetchDurationFieldCandidates` in
// `x-pack/plugins/observability_solution/apm/server/routes/correlations/queries/fetch_failed_events_correlation_p_values.ts`

export const getSignificantTermRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldName: string,
  { wrap }: RandomSamplerWrapper
): estypes.SearchRequest => {
  const query = getQueryWithParams({
    params,
  });

  const timeFieldName = params.timeFieldName ?? '@timestamp';

  let filter: estypes.QueryDslQueryContainer[] = [];

  if (query.bool && Array.isArray(query.bool.filter)) {
    filter = query.bool.filter.filter((d) => Object.keys(d)[0] !== 'range');

    query.bool.filter = [
      ...filter,
      {
        range: {
          [timeFieldName]: {
            gte: params.deviationMin,
            lt: params.deviationMax,
            format: 'epoch_millis',
          },
        },
      },
    ];
  }

  const pValueAgg: Record<'change_point_p_value', estypes.AggregationsAggregationContainer> = {
    change_point_p_value: {
      significant_terms: {
        field: fieldName,
        background_filter: {
          bool: {
            filter: [
              ...filter,
              {
                range: {
                  [timeFieldName]: {
                    gte: params.baselineMin,
                    lt: params.baselineMax,
                    format: 'epoch_millis',
                  },
                },
              },
            ],
          },
        },
        // @ts-expect-error `p_value` is not yet part of `AggregationsAggregationContainer`
        p_value: { background_is_superset: false },
        size: 1000,
      },
    },
  };

  const body = {
    query,
    size: 0,
    aggs: wrap(pValueAgg),
  };

  return {
    ...getRequestBase(params),
    body,
  };
};

interface Aggs extends estypes.AggregationsSignificantLongTermsAggregate {
  doc_count: number;
  bg_count: number;
  buckets: estypes.AggregationsSignificantLongTermsBucket[];
}

export const fetchSignificantTermPValues = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldNames: string[],
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<SignificantItem[]> => {
  const randomSamplerWrapper = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const result: SignificantItem[] = [];

  const settledPromises = await Promise.allSettled(
    fieldNames.map((fieldName) =>
      esClient.search(getSignificantTermRequest(params, fieldName, randomSamplerWrapper), {
        signal: abortSignal,
        maxRetries: 0,
      })
    )
  );

  function reportError(fieldName: string, error: unknown) {
    if (!isRequestAbortedError(error)) {
      logger.error(
        `Failed to fetch p-value aggregation for fieldName "${fieldName}", got: \n${JSON.stringify(
          error,
          null,
          2
        )}`
      );
      emitError(`Failed to fetch p-value aggregation for fieldName "${fieldName}".`);
    }
  }

  for (const [index, settledPromise] of settledPromises.entries()) {
    const fieldName = fieldNames[index];

    if (settledPromise.status === 'rejected') {
      reportError(fieldName, settledPromise.reason);
      // Still continue the analysis even if individual p-value queries fail.
      continue;
    }

    const resp = settledPromise.value;

    if (resp.aggregations === undefined) {
      reportError(fieldName, resp);
      // Still continue the analysis even if individual p-value queries fail.
      continue;
    }

    const overallResult = (
      randomSamplerWrapper.unwrap(resp.aggregations) as Record<'change_point_p_value', Aggs>
    ).change_point_p_value;

    for (const bucket of overallResult.buckets) {
      const pValue = Math.exp(-bucket.score);

      if (typeof pValue === 'number' && pValue < LOG_RATE_ANALYSIS_SETTINGS.P_VALUE_THRESHOLD) {
        result.push({
          key: `${fieldName}:${String(bucket.key)}`,
          type: SIGNIFICANT_ITEM_TYPE.KEYWORD,
          fieldName,
          fieldValue: String(bucket.key),
          doc_count: bucket.doc_count,
          bg_count: bucket.bg_count,
          total_doc_count: overallResult.doc_count,
          total_bg_count: overallResult.bg_count,
          score: bucket.score,
          pValue,
          normalizedScore: getNormalizedScore(bucket.score),
        });
      }
    }
  }

  return uniqBy(result, (d) => `${d.fieldName},${d.fieldValue}`);
};
