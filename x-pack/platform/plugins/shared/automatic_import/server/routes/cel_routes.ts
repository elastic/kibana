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
import { CEL_INPUT_GRAPH_PATH, CelInputRequestBody, CelInputResponse } from '../../common';
import { FLEET_ALL_ROLE, INTEGRATIONS_ALL_ROLE, ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getCelGraph } from '../graphs/cel';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';

export function registerCelInputRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: CEL_INPUT_GRAPH_PATH,
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
            body: buildRouteValidationWithZod(CelInputRequestBody),
          },
        },
      },
      withAvailability(
        async (context, request, res): Promise<IKibanaResponse<CelInputResponse>> => {
          const { dataStreamTitle, celDetails, langSmithOptions } = request.body;
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
              dataStreamName: dataStreamTitle,
              path: celDetails.path,
              authType: celDetails.auth,
              openApiPathDetails: JSON.parse(celDetails.openApiDetails?.operation ?? ''),
              openApiSchemas: JSON.parse(celDetails.openApiDetails?.schemas ?? ''),
              openApiAuthSchema: celDetails.openApiDetails?.auth
                ? JSON.parse(celDetails.openApiDetails?.auth)
                : undefined,
            };

            const options = {
              callbacks: [
                new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langSmithOptions, logger }),
              ],
            };

            const graph = await getCelGraph({ model });
            const results = await graph.withConfig({ runName: 'CEL' }).invoke(parameters, options);

            return res.ok({ body: CelInputResponse.parse(results) });
          } catch (e) {
            if (isErrorThatHandlesItsOwnResponse(e)) {
              return e.sendResponse(res);
            }
            return res.badRequest({ body: e });
          }
        }
      )
    );
}
