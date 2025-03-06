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
import {
  ACTIONS_AND_CONNECTORS_ALL_ROLE,
  FLEET_ALL_ROLE,
  INTEGRATIONS_ALL_ROLE,
  ROUTE_HANDLER_TIMEOUT,
} from '../constants';
import { getCategorizationGraph } from '../graphs/categorization';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { getLLMClass, getLLMType } from '../util/llm';
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
    })
    .addVersion(
      {
        version: '1',
        security: {
          authz: {
            requiredPrivileges: [
              FLEET_ALL_ROLE,
              INTEGRATIONS_ALL_ROLE,
              ACTIONS_AND_CONNECTORS_ALL_ROLE,
            ],
          },
        },
        validate: {
          request: {
            body: buildRouteValidationWithZod(CategorizationRequestBody),
          },
        },
      },
      withAvailability(
        async (context, req, res): Promise<IKibanaResponse<CategorizationResponse>> => {
          const {
            packageName,
            dataStreamName,
            rawSamples,
            samplesFormat,
            currentPipeline,
            langSmithOptions,
          } = req.body;
          const services = await context.resolve(['core']);
          const { client } = services.core.elasticsearch;
          const { getStartServices, logger } = await context.automaticImport;
          const [, { actions: actionsPlugin }] = await getStartServices();

          try {
            const actionsClient = await actionsPlugin.getActionsClientWithRequest(req);
            const connector = await actionsClient.get({ id: req.body.connectorId });

            const abortSignal = getRequestAbortedSignal(req.events.aborted$);

            const actionTypeId = connector.actionTypeId;
            const llmType = getLLMType(actionTypeId);
            const llmClass = getLLMClass(llmType);

            const model = new llmClass({
              actionsClient,
              connectorId: connector.id,
              logger,
              llmType,
              model: connector.config?.defaultModel,
              temperature: 0.05,
              maxTokens: 4096,
              signal: abortSignal,
              streaming: false,
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
