/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniqBy } from 'lodash';

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import {
  createRandomSamplerWrapper,
  type RandomSamplerWrapper,
} from '@kbn/ml-random-sampler-utils';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { LOG_RATE_ANALYSIS_SETTINGS, RANDOM_SAMPLER_SEED } from '../constants';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getNormalizedScore } from './get_normalized_score';
import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

// TODO Consolidate with duplicate `fetchDurationFieldCandidates` in
// `x-pack/solutions/observability/plugins/apm/server/routes/correlations/queries/fetch_failed_events_correlation_p_values.ts`

export const getSignificantTermRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldNames: string[],
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

  const fieldCandidateAggs = fieldNames.reduce<
    Record<string, estypes.AggregationsAggregationContainer>
  >((aggs, fieldName, index) => {
    // Used to identify fields with only one distinct value which we'll ignore in the analysis.
    aggs[`distinct_count_${index}`] = {
      cardinality: {
        field: fieldName,
      },
    };

    // Used to calculate the p-value for the field.
    aggs[`sig_term_p_value_${index}`] = {
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
        p_value: { background_is_superset: false },
        size: 1000,
      },
    };

    return aggs;
  }, {});

  const body = {
    query,
    size: 0,
    aggs: wrap(fieldCandidateAggs),
  };

  return {
    ...getRequestBase(params),
    ...body,
  };
};

interface Aggs extends estypes.AggregationsSignificantLongTermsAggregate {
  doc_count: number;
  bg_count: number;
  buckets: estypes.AggregationsSignificantLongTermsBucket[];
}

export const fetchSignificantTermPValues = async ({
  esClient,
  abortSignal,
  logger,
  emitError,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  abortSignal?: AbortSignal;
  logger?: Logger;
  emitError?: (m: string) => void;
  arguments: AiopsLogRateAnalysisSchema & {
    fieldNames: string[];
    sampleProbability?: number;
  };
}): Promise<SignificantItem[]> => {
  // The default value of 1 means no sampling will be used
  const { fieldNames, sampleProbability = 1, ...params } = args;

  const randomSamplerWrapper = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const result: SignificantItem[] = [];

  const resp = await esClient.search(
    getSignificantTermRequest(params, fieldNames, randomSamplerWrapper),
    {
      signal: abortSignal,
      maxRetries: 0,
    }
  );

  if (resp.aggregations === undefined) {
    if (!isRequestAbortedError(resp)) {
      if (logger) {
        logger.error(
          `Failed to fetch p-value aggregation for field names ${fieldNames.join()}, got: \n${JSON.stringify(
            resp,
            null,
            2
          )}`
        );
      }

      if (emitError) {
        emitError(`Failed to fetch p-value aggregation for field names "${fieldNames.join()}".`);
      }
    }
    return result;
  }

  const unwrappedResp = randomSamplerWrapper.unwrap(resp.aggregations) as Record<string, Aggs>;

  for (const [index, fieldName] of fieldNames.entries()) {
    const pValueBuckets = unwrappedResp[`sig_term_p_value_${index}`];
    const distinctCount = (
      unwrappedResp[
        `distinct_count_${index}`
      ] as unknown as estypes.AggregationsCardinalityAggregate
    ).value;

    for (const bucket of pValueBuckets.buckets) {
      const pValue = Math.exp(-bucket.score);

      if (
        typeof pValue === 'number' &&
        // Skip items where the p-value is not significant.
        pValue < LOG_RATE_ANALYSIS_SETTINGS.P_VALUE_THRESHOLD &&
        // Skip items where the field has only one distinct value.
        distinctCount > 1
      ) {
        result.push({
          key: `${fieldName}:${String(bucket.key)}`,
          type: SIGNIFICANT_ITEM_TYPE.KEYWORD,
          fieldName,
          fieldValue: String(bucket.key),
          doc_count: bucket.doc_count,
          bg_count: bucket.bg_count,
          total_doc_count: pValueBuckets.doc_count,
          total_bg_count: pValueBuckets.bg_count,
          score: bucket.score,
          pValue,
          normalizedScore: getNormalizedScore(bucket.score),
        });
      }
    }
  }

  return uniqBy(result, (d) => `${d.fieldName},${d.fieldValue}`);
};
