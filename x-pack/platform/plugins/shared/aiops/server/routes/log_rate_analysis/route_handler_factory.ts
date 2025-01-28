/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import type { Logger } from '@kbn/logging';
import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { AIOPS_ANALYSIS_RUN_ORIGIN, AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsLicense } from '../../types';

import { responseStreamFactory } from './response_stream_factory';

/**
 * The log rate analysis route handler sets up `responseStreamFactory`
 * to create the response stream and then uses its handlers to
 * walk through the steps of the analysis.
 */
export function routeHandlerFactory<T extends ApiVersion>(
  version: T,
  license: AiopsLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema<T>> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema<T>>,
    response: KibanaResponseFactory
  ) => {
    const { headers } = request;

    trackAIOpsRouteUsage(
      `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`,
      headers[AIOPS_ANALYSIS_RUN_ORIGIN],
      usageCounter
    );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const executionContext = createExecutionContext(coreStart, AIOPS_PLUGIN_ID, request.route.path);

    return await coreStart.executionContext.withContext(executionContext, () => {
      const { analysis, logDebugMessage, stateHandler, responseStream, responseWithHeaders } =
        responseStreamFactory<T>({
          version,
          esClient,
          requestBody: request.body,
          events: request.events,
          headers: request.headers,
          logger,
        });

      async function runAnalysis() {
        try {
          logDebugMessage('Starting analysis.');
          logDebugMessage(`Sample probability: ${stateHandler.sampleProbability()}`);

          stateHandler.isRunning(true);
          analysis.overridesHandler();
          responseStream.pushPingWithTimeout();

          // Step 1: Index Info: Field candidates and zero docs fallback flag
          const indexInfo = await withSpan(
            { name: 'fetch_index_info', type: 'aiops-log-rate-analysis' },
            () => analysis.indexInfoHandler()
          );

          if (!indexInfo) {
            return;
          }

          // Step 2: Significant categories and terms
          const significantItemsObj = indexInfo.zeroDocsFallback
            ? await withSpan({ name: 'fetch_top_items', type: 'aiops-log-rate-analysis' }, () =>
                analysis.topItemsHandler(indexInfo)
              )
            : await withSpan(
                { name: 'fetch_significant_items', type: 'aiops-log-rate-analysis' },
                () => analysis.significantItemsHandler(indexInfo)
              );

          if (!significantItemsObj) {
            return;
          }

          const { fieldValuePairsCount, significantCategories, significantTerms } =
            significantItemsObj;

          // Step 3: Fetch overall histogram
          const overallTimeSeries = await withSpan(
            { name: 'fetch_overall_timeseries', type: 'aiops-log-rate-analysis' },
            () => analysis.overallHistogramHandler()
          );

          // Step 4: Histograms
          await withSpan(
            { name: 'significant-item-histograms', type: 'aiops-log-rate-analysis' },
            () =>
              analysis.histogramHandler(
                fieldValuePairsCount,
                significantCategories,
                significantTerms,
                overallTimeSeries
              )
          );

          // Step 5: Smart grouping
          if (stateHandler.groupingEnabled()) {
            await withSpan(
              { name: 'grouping-with-histograms', type: 'aiops-log-rate-analysis' },
              () =>
                analysis.groupingHandler(significantCategories, significantTerms, overallTimeSeries)
            );
          }

          responseStream.endWithUpdatedLoadingState();
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(`Log Rate Analysis failed to finish, got: \n${e.toString()}`);
            responseStream.pushError(`Log Rate Analysis failed to finish.`);
          }
          responseStream.end();
        }
      }

      // Do not call this using `await` so it will run asynchronously while we return the stream already.
      void runAnalysis();

      return response.ok(responseWithHeaders);
    });
  };
}
