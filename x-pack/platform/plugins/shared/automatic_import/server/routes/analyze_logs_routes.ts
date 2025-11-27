/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ANALYZE_LOGS_PATH, AnalyzeLogsRequestBody, AnalyzeLogsResponse } from '../../common';
import { FLEET_ALL_ROLE, INTEGRATIONS_ALL_ROLE, ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getLogFormatDetectionGraph } from '../graphs/log_type_detection/graph';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse, UnsupportedLogFormatError } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';
import { CefError } from '../lib/errors/cef_error';

export function registerAnalyzeLogsRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: ANALYZE_LOGS_PATH,
      access: 'internal',
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
      security: {
        authz: {
          requiredPrivileges: [FLEET_ALL_ROLE, INTEGRATIONS_ALL_ROLE],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(AnalyzeLogsRequestBody),
          },
        },
      },
      withAvailability(
        async (context, request, res): Promise<IKibanaResponse<AnalyzeLogsResponse>> => {
          const {
            packageName,
            dataStreamName,
            packageTitle,
            dataStreamTitle,
            logSamples,
            langSmithOptions,
          } = request.body;
          const services = await context.resolve(['core']);
          const { client } = services.core.elasticsearch;
          const { getStartServices, logger } = await context.automaticImport;
          const [, startPlugins] = await getStartServices();

          try {
            const inference = await startPlugins.inference;
            const abortSignal = getRequestAbortedSignal(request.events.aborted$);
            const connectorId = request.body.connectorId;

            const model = await inference.getChatModel({
              request,
              connectorId,
              chatModelOptions: {
                // not passing specific `model`, we'll always use the connector default model
                // temperature may need to be parametrized in the future
                temperature: 0.05,
                // Only retry once inside the model call, we already handle backoff retries in the task runner for the entire task
                maxRetries: 1,
                // Disable streaming explicitly
                disableStreaming: true,
                // Set a hard limit of 50 concurrent requests
                maxConcurrency: 50,
                telemetryMetadata: { pluginId: 'automatic_import' },
                signal: abortSignal,
              },
            });
            const options = {
              callbacks: [
                new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langSmithOptions, logger }),
              ],
            };

            const logFormatParameters = {
              packageName,
              dataStreamName,
              packageTitle,
              dataStreamTitle,
              logSamples,
            };
            const graph = await getLogFormatDetectionGraph({ model, client });
            const graphResults = await graph
              .withConfig({ runName: 'Log Format' })
              .invoke(logFormatParameters, options);
            const graphLogFormat = (graphResults.results as { samplesFormat: { name: string } })
              .samplesFormat.name;

            switch (graphLogFormat) {
              case 'unsupported':
                throw new UnsupportedLogFormatError({
                  message: GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT,
                });
              case 'cef':
                throw new CefError(GenerationErrorCode.CEF_ERROR);
              case 'leef':
                throw new UnsupportedLogFormatError({
                  message: GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT,
                  logFormat: 'Log Event Extended Format (LEEF)',
                });
              case 'fix':
                throw new UnsupportedLogFormatError({
                  message: GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT,
                  logFormat: 'Financial Information eXchange (FIX)',
                });
            }

            return res.ok({ body: AnalyzeLogsResponse.parse(graphResults) });
          } catch (err) {
            try {
              handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT_ANALYZE_LOGS);
            } catch (e) {
              if (isErrorThatHandlesItsOwnResponse(e)) {
                return e.sendResponse(res);
              }
            }
            return res.badRequest({ body: err });
          }
        }
      )
    );
}
