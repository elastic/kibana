/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EVALUATE_URL,
  EvaluateRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { isValidTraceId } from '@opentelemetry/api';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  EvaluationEmissionError,
  emitEvaluationResults,
  findEmittedEvaluators,
  toEvaluatorKey,
} from '../../online_evals/evaluation_emission';
import {
  findDuplicateEvaluatorNames,
  getDuplicateEvaluatorNamesMessage,
} from '../../lib/duplicate_evaluator_names';
import type { RouteDependencies } from '../register_routes';
import {
  EvaluationExecutionError,
  executeEvaluators,
  type ResolvedEvaluator,
} from './shared/execute_evaluators';

export const registerEvaluateRoute = ({
  router,
  logger,
  evaluatorRegistry,
  getInferenceStart,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATE_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Evaluate trace with one or more evaluators',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EvaluateRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { subject, evaluators, emit } = request.body;
        const duplicateEvaluatorNames = findDuplicateEvaluatorNames(evaluators);
        if (duplicateEvaluatorNames.length > 0) {
          return response.badRequest({
            body: { message: getDuplicateEvaluatorNamesMessage(duplicateEvaluatorNames) },
          });
        }

        const [{ trace_id: traceId }] = subject.traces;
        if (emit && (subject.mode === 'multi-turn' || !isValidTraceId(traceId))) {
          return response.badRequest({
            body: { message: 'emit requires a single-turn subject with a valid trace_id' },
          });
        }

        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
        const scopedRegistry = evaluatorRegistry.asScoped({ spaceId });
        const resolvedEvaluators: ResolvedEvaluator[] = [];

        for (const config of evaluators) {
          const definition = await scopedRegistry.get(config.name, config.version);
          if (!definition) {
            const message = config.version
              ? `Evaluator not found: ${config.name}@${config.version}`
              : `Evaluator not found: ${config.name}`;
            return response.badRequest({ body: { message } });
          }
          resolvedEvaluators.push({ definition, connectorId: config.connector_id });
        }

        const coreContext = await context.core;
        const internalClient = coreContext.elasticsearch.client.asInternalUser;

        try {
          const emittedEvaluators = emit
            ? await findEmittedEvaluators({
                esClient: internalClient,
                logger,
                spaceId,
                monitorId: emit.monitor.id,
                traceId,
              })
            : new Set<string>();
          const evaluatorsToRun: ResolvedEvaluator[] = [];
          const skippedEvaluators: string[] = [];
          for (const resolved of resolvedEvaluators) {
            const key = toEvaluatorKey(resolved.definition.name, resolved.definition.version);
            if (emittedEvaluators.has(key)) {
              skippedEvaluators.push(key);
            } else {
              evaluatorsToRun.push(resolved);
            }
          }

          if (evaluatorsToRun.length === 0) {
            return response.ok({
              body: {
                results: [],
                emission: { emitted: 0, skipped_evaluators: skippedEvaluators },
              },
            });
          }

          const results = await executeEvaluators({
            coreContext,
            request,
            subject,
            evaluators: evaluatorsToRun,
            logger,
            getInferenceStart,
            // Unchanged from before this route was refactored: experiment runs reach here
            // through a workflow's fake request, so scoping the read to the caller needs
            // its own change. Only persisted evaluators run here, so the prompt is not
            // caller-controlled the way it is on `_test`.
            traceReader: internalClient,
          });

          if (!emit) {
            return response.ok({ body: { results } });
          }

          const { evaluationEventsEmitter } = await context.evals;
          const emission = await emitEvaluationResults({
            emitter: evaluationEventsEmitter,
            traceReader: internalClient,
            logger,
            spaceId,
            traceId,
            emit,
            results,
            connectorIdByEvaluator: new Map(
              evaluatorsToRun.flatMap(({ definition, connectorId }) =>
                connectorId ? [[definition.name, connectorId] as const] : []
              )
            ),
            skippedEvaluators,
          });

          return response.ok({ body: { results, emission } });
        } catch (error) {
          if (error instanceof EvaluationExecutionError) {
            return response[error.responseType]({ body: { message: error.message } });
          }
          if (error instanceof EvaluationEmissionError) {
            return response.customError({
              statusCode: 500,
              body: { message: 'Failed to store evaluation events' },
            });
          }
          throw error;
        }
      }
    );
};
