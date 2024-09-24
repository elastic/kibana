/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniqBy } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import {
  createRandomSamplerWrapper,
  type RandomSamplerWrapper,
} from '@kbn/ml-random-sampler-utils';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { LOG_RATE_ANALYSIS_SETTINGS, RANDOM_SAMPLER_SEED } from '../constants';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';
import type { FetchTopOptions } from './fetch_top_types';

// TODO Consolidate with duplicate `fetchDurationFieldCandidates` in
// `x-pack/plugins/observability_solution/apm/server/routes/correlations/queries/fetch_failed_events_correlation_p_values.ts`

const TOP_TERM_AGG_PREFIX = 'top_terms_';

export const getTopTermRequest = (
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

  const termAggs = fieldNames.reduce<Record<string, estypes.AggregationsAggregationContainer>>(
    (aggs, fieldName, index) => {
      aggs[`${TOP_TERM_AGG_PREFIX}${index}`] = {
        terms: {
          field: fieldName,
          size: LOG_RATE_ANALYSIS_SETTINGS.TOP_TERMS_FALLBACK_SIZE,
        },
      };

      return aggs;
    },
    {}
  );

  const body = {
    query,
    size: 0,
    aggs: wrap(termAggs),
  };

  return {
    ...getRequestBase(params),
    body,
  };
};

interface Aggs extends estypes.AggregationsLongTermsAggregate {
  buckets: estypes.AggregationsLongTermsBucket[];
}

export const fetchTopTerms = async ({
  esClient,
  abortSignal,
  emitError,
  logger,
  arguments: args,
}: FetchTopOptions): Promise<SignificantItem[]> => {
  // The default value of 1 means no sampling will be used
  const { fieldNames, sampleProbability = 1, ...params } = args;

  const randomSamplerWrapper = createRandomSamplerWrapper({
    probability: sampleProbability,
    seed: RANDOM_SAMPLER_SEED,
  });

  const result: SignificantItem[] = [];

  const resp = await esClient.search(getTopTermRequest(params, fieldNames, randomSamplerWrapper), {
    signal: abortSignal,
    maxRetries: 0,
  });

  if (resp.aggregations === undefined) {
    if (!isRequestAbortedError(resp)) {
      if (logger) {
        logger.error(
          `Failed to fetch terms aggregation for field names ${fieldNames.join()}, got: \n${JSON.stringify(
            resp,
            null,
            2
          )}`
        );
      }

      if (emitError) {
        emitError(`Failed to fetch terms aggregation for field names ${fieldNames.join()}.`);
      }
    }
    return result;
  }

  const unwrappedResp = randomSamplerWrapper.unwrap(resp.aggregations) as Record<string, Aggs>;

  for (const [index, fieldName] of fieldNames.entries()) {
    const termBuckets = unwrappedResp[`${TOP_TERM_AGG_PREFIX}${index}`];

    for (const bucket of termBuckets.buckets) {
      result.push({
        key: `${fieldName}:${String(bucket.key)}`,
        type: SIGNIFICANT_ITEM_TYPE.KEYWORD,
        fieldName,
        fieldValue: String(bucket.key),
        doc_count: bucket.doc_count,
        bg_count: 0,
        total_doc_count: 0,
        total_bg_count: 0,
        score: 0,
        pValue: 1,
        normalizedScore: 0,
      });
    }
  }

  return uniqBy(result, (d) => `${d.fieldName},${d.fieldValue}`);
};
