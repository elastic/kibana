/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type NumericChartData } from '@kbn/ml-agg-utils';
import { RANDOM_SAMPLER_SEED } from '@kbn/aiops-log-rate-analysis/constants';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { getHistogramQuery } from '@kbn/aiops-log-rate-analysis/queries/get_histogram_query';
import {
  getMiniHistogramAgg,
  type MiniHistogramAgg,
} from '@kbn/aiops-log-rate-analysis/queries/mini_histogram_utils';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const overallHistogramHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    requestBody,
    logDebugMessage,
    logger,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async (): Promise<NumericChartData['data']> => {
    logDebugMessage('Fetch overall histogram.');

    const overallHistogramQuery = getHistogramQuery(requestBody);
    const miniHistogramAgg = getMiniHistogramAgg(requestBody);

    const { wrap, unwrap } = createRandomSamplerWrapper({
      probability: stateHandler.sampleProbability() ?? 1,
      seed: RANDOM_SAMPLER_SEED,
    });

    let resp;

    try {
      resp = await esClient.search(
        {
          index: requestBody.index,
          size: 0,
          body: {
            query: overallHistogramQuery,
            aggs: wrap(miniHistogramAgg),
            size: 0,
          },
        },
        { signal: abortSignal, maxRetries: 0 }
      );
    } catch (e) {
      if (!isRequestAbortedError(e)) {
        logger.error(`Failed to fetch the overall histogram data, got: \n${e.toString()}`);
        responseStream.pushError(`Failed to fetch overall histogram data.`);
      }
      // Still continue the analysis even if loading the overall histogram fails.
    }

    if (stateHandler.shouldStop()) {
      logDebugMessage('shouldStop after fetching overall histogram.');
      responseStream.end();
      return [];
    }

    if (resp?.aggregations === undefined) {
      if (!isRequestAbortedError(resp)) {
        if (logger) {
          logger.error(
            `Failed to fetch the histogram data chunk, got: \n${JSON.stringify(resp, null, 2)}`
          );
        }

        responseStream.pushError(`Failed to fetch the histogram data chunk.`);
      }
      return [];
    }

    const unwrappedResp = unwrap(resp.aggregations) as MiniHistogramAgg;
    return unwrappedResp.mini_histogram.buckets;
  };
