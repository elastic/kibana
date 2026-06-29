/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EVALUATOR_EVALUATE_URL,
  ExecuteEvaluatorRequestBody,
  ExecuteEvaluatorRequestParams,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { createTraceAccessor } from '../../evaluators/groundedness/trace_accessor';
import type { RouteDependencies } from '../register_routes';

export const registerExecuteEvaluatorRoute = ({
  router,
  logger,
  evaluatorRegistry,
  getInferenceStart,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATOR_EVALUATE_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Execute evaluator',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ExecuteEvaluatorRequestParams),
            body: buildRouteValidationWithZod(ExecuteEvaluatorRequestBody),
          },
        },
      },
      async (context, request, response) => {
        if (!evaluatorRegistry) {
          logger.error('Evaluator registry is not configured');
          return response.customError({
            statusCode: 500,
            body: { message: 'Evaluator registry is not configured' },
          });
        }

        const { evaluatorName } = request.params;
        const {
          connector_id: connectorId,
          trace_id: traceId,
          reference_data: referenceData,
        } = request.body;
        const definition = evaluatorRegistry.get(evaluatorName);

        if (!definition) {
          return response.notFound({
            body: { message: `Evaluator not found: ${evaluatorName}` },
          });
        }

        if (definition.kind === 'llm' && !connectorId) {
          return response.badRequest({
            body: { message: 'connector_id is required for llm evaluators' },
          });
        }

        try {
          let inferenceClient;
          if (definition.kind === 'llm') {
            if (!getInferenceStart) {
              logger.error('Inference start contract is not configured');
              return response.customError({
                statusCode: 500,
                body: { message: 'Inference start contract is not configured' },
              });
            }

            const inference = await getInferenceStart();
            if (connectorId) {
              inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
            }
          }

          const coreContext = await context.core;
          const traceAccessor = createTraceAccessor({
            traceId,
            esClient: coreContext.elasticsearch.client.asInternalUser,
          });

          const result = await definition.evaluate({
            trace: traceAccessor,
            referenceData,
            inferenceClient,
            log: logger,
          });

          return response.ok({
            body: {
              evaluator: {
                name: definition.name,
                version: definition.version,
                kind: definition.kind,
              },
              ...result,
            },
          });
        } catch (error) {
          logger.error(`Failed to execute evaluator "${evaluatorName}": ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to execute evaluator "${evaluatorName}"` },
          });
        }
      }
    );
};
