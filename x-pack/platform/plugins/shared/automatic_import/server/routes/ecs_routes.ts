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
import { ECS_GRAPH_PATH, EcsMappingRequestBody, EcsMappingResponse } from '../../common';
import { FLEET_ALL_ROLE, INTEGRATIONS_ALL_ROLE, ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getEcsGraph } from '../graphs/ecs';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';
import { handleCustomErrors } from './routes_util';
import { GenerationErrorCode } from '../../common/constants';

export function registerEcsRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: ECS_GRAPH_PATH,
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
            body: buildRouteValidationWithZod(EcsMappingRequestBody),
          },
        },
      },
      withAvailability(
        async (context, request, res): Promise<IKibanaResponse<EcsMappingResponse>> => {
          const {
            packageName,
            dataStreamName,
            samplesFormat,
            rawSamples,
            additionalProcessors,
            mapping,
            langSmithOptions,
          } = request.body;
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
              samplesFormat,
              additionalProcessors,
              ...(mapping && { mapping }),
            };

            const options = {
              callbacks: [
                new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langSmithOptions, logger }),
              ],
            };

            const graph = await getEcsGraph({ model });
            const results = await graph
              .withConfig({ runName: 'ECS Mapping' })
              .invoke(parameters, options);

            return res.ok({ body: EcsMappingResponse.parse(results) });
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
