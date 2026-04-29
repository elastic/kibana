/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { queue } from 'async';

import { i18n } from '@kbn/i18n';
import type {
  SignificantItem,
  SignificantItemHistogram,
  NumericChartData,
} from '@kbn/ml-agg-utils';
import { QUEUE_CHUNKING_SIZE } from '@kbn/aiops-log-rate-analysis/queue_field_candidates';
import {
  addSignificantItemsHistogram,
  updateLoadingState,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import { fetchMiniHistogramsForSignificantItems } from '@kbn/aiops-log-rate-analysis/queries/fetch_mini_histograms_for_significant_items';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';

import {
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_HISTOGRAMS,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const histogramHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async (
    fieldValuePairsCount: number,
    significantCategories: SignificantItem[],
    significantTerms: SignificantItem[],
    overallTimeSeries?: NumericChartData['data']
  ) => {
    function pushHistogramDataLoadingState() {
      responseStream.push(
        updateLoadingState({
          ccsWarning: false,
          loaded: stateHandler.loaded(),
          loadingState: i18n.translate(
            'xpack.aiops.logRateAnalysis.loadingState.loadingHistogramData',
            {
              defaultMessage: 'Loading histogram data.',
            }
          ),
        })
      );
    }

    logDebugMessage(`Fetch ${significantTerms.length} field/value histograms.`);

    // time series filtered by fields
    if (
      (significantTerms.length > 0 || significantCategories.length > 0) &&
      overallTimeSeries !== undefined &&
      !requestBody.overrides?.regroupOnly
    ) {
      const fieldValueHistogramQueueChunks = [
        ...chunk(significantTerms, QUEUE_CHUNKING_SIZE),
        ...chunk(significantCategories, QUEUE_CHUNKING_SIZE),
      ];
      const loadingStepSize =
        (1 / fieldValueHistogramQueueChunks.length) * PROGRESS_STEP_HISTOGRAMS;

      const fieldValueHistogramQueue = queue(async function (payload: SignificantItem[]) {
        if (stateHandler.shouldStop()) {
          logDebugMessage('shouldStop abort fetching field/value histograms.');
          fieldValueHistogramQueue.kill();
          responseStream.end();
          return;
        }

        if (overallTimeSeries !== undefined) {
          let histograms: SignificantItemHistogram[];

          try {
            histograms = await fetchMiniHistogramsForSignificantItems(
              esClient,
              requestBody,
              payload,
              overallTimeSeries,
              logger,
              stateHandler.sampleProbability(),
              () => {},
              abortSignal
            );
          } catch (e) {
            logger.error(`Failed to fetch the histogram data chunk, got: \n${e.toString()}`);
            responseStream.pushError(`Failed to fetch the histogram data chunk.`);
            return;
          }

          stateHandler.loaded(loadingStepSize, false);
          pushHistogramDataLoadingState();
          responseStream.push(addSignificantItemsHistogram(histograms));
        }
      }, MAX_CONCURRENT_QUERIES);

      await fieldValueHistogramQueue.push(fieldValueHistogramQueueChunks);
      await fieldValueHistogramQueue.drain();
    }
  };
