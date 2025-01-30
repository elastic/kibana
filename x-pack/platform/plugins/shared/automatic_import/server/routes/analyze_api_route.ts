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
import { ANALYZE_API_PATH, AnalyzeApiRequestBody, AnalyzeApiResponse } from '../../common';
import {
  ACTIONS_AND_CONNECTORS_ALL_ROLE,
  FLEET_ALL_ROLE,
  INTEGRATIONS_ALL_ROLE,
  ROUTE_HANDLER_TIMEOUT,
} from '../constants';
import { getApiAnalysisGraph } from '../graphs/api_analysis';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { getLLMClass, getLLMType } from '../util/llm';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { isErrorThatHandlesItsOwnResponse } from '../lib/errors';

export function registerApiAnalysisRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  router.versioned
    .post({
      path: ANALYZE_API_PATH,
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
            body: buildRouteValidationWithZod(AnalyzeApiRequestBody),
          },
        },
      },
      withAvailability(async (context, req, res): Promise<IKibanaResponse<AnalyzeApiResponse>> => {
        const { dataStreamTitle, pathOptions, langSmithOptions } = req.body;
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
            dataStreamName: dataStreamTitle,
            pathOptions,
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          const graph = await getApiAnalysisGraph({ model });
          const results = await graph
            .withConfig({ runName: 'API analysis' })
            .invoke(parameters, options);

          return res.ok({ body: AnalyzeApiResponse.parse(results) });
        } catch (e) {
          if (isErrorThatHandlesItsOwnResponse(e)) {
            return e.sendResponse(res);
          }
          return res.badRequest({ body: e });
        }
      })
    );
}
