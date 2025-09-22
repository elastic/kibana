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
import {
  CATEGORIZATION_GRAPH_PATH,
  CategorizationRequestBody,
  CategorizationResponse,
} from '../../common';
import { FLEET_ALL_ROLE, INTEGRATIONS_ALL_ROLE, ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getCategorizationGraph } from '../graphs/categorization';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { CATEGORIZATION_RECURSION_LIMIT, GenerationErrorCode } from '../../common/constants';

export function registerCategorizationRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: CATEGORIZATION_GRAPH_PATH,
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
            body: buildRouteValidationWithZod(CategorizationRequestBody),
          },
        },
      },
      withAvailability(
        async (context, request, res): Promise<IKibanaResponse<CategorizationResponse>> => {
          const {
            packageName,
            dataStreamName,
            rawSamples,
            samplesFormat,
            currentPipeline,
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

            const parameters = {
              packageName,
              dataStreamName,
              rawSamples,
              currentPipeline,
              samplesFormat,
            };
            const options = {
              recursionLimit: CATEGORIZATION_RECURSION_LIMIT,
              callbacks: [
                new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langSmithOptions, logger }),
              ],
            };

            const graph = await getCategorizationGraph({ client, model });
            const results = await graph
              .withConfig({ runName: 'Categorization' })
              .invoke(parameters, options);

            return res.ok({ body: CategorizationResponse.parse(results) });
          } catch (err) {
            try {
              handleCustomErrors(err, GenerationErrorCode.RECURSION_LIMIT);
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
