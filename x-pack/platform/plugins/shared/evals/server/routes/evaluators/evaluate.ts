/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidTraceId } from '@opentelemetry/api';
import {
  API_VERSIONS,
  EVALS_EVALUATE_URL,
  EvaluateRequestBody,
  type EvaluateResponse,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { getInstrumentationProfile } from '../../evaluators/evidence/resolve_instrumentation';
import { formatEvidenceSchemaIssues } from '../../evaluators/evidence/schema_issues';
import { createTraceAccessor } from '../../evaluators/trace_accessor';
import { awaitTraceReady, TraceReadinessError } from '../../evaluators/trace_readiness';
import type { EvaluatorDefinition } from '../../evaluators/types';
import type { RouteDependencies } from '../register_routes';

export const registerEvaluateRoute = ({
  router,
  logger,
  evaluatorRegistry,
  getInferenceStart,
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
        const { subject, evaluators } = request.body;
        if (subject.mode === 'multi-turn') {
          return response.badRequest({
            body: { message: 'multi-turn evaluation is not yet supported' },
          });
        }

        if (subject.mode === 'single-turn' && subject.traces.length !== 1) {
          return response.badRequest({
            body: { message: 'single-turn mode requires exactly one trace' },
          });
        }

        const resolvedEvaluators: Array<{
          config: (typeof evaluators)[number];
          definition: EvaluatorDefinition;
          parsedReferenceData?: Record<string, unknown>;
        }> = [];

        for (const config of evaluators) {
          const definition = evaluatorRegistry.get(config.name, config.version);
          if (!definition) {
            const message = config.version
              ? `Evaluator not found: ${config.name}@${config.version}`
              : `Evaluator not found: ${config.name}`;
            return response.badRequest({ body: { message } });
          }

          if (definition.kind === 'llm' && !config.connector_id) {
            return response.badRequest({
              body: { message: `connector_id is required for llm evaluator "${config.name}"` },
            });
          }

          resolvedEvaluators.push({ config, definition });
        }

        const [{ trace_id: traceId, reference_data: referenceData }] = subject.traces;
        if (!isValidTraceId(traceId)) {
          return response.badRequest({
            body: { message: 'Invalid trace_id: must be a 32-character hex string' },
          });
        }

        for (const entry of resolvedEvaluators) {
          if (!entry.definition.referenceDataSchema) {
            entry.parsedReferenceData = referenceData;
            continue;
          }
          const parsed = entry.definition.referenceDataSchema.safeParse(referenceData);
          if (!parsed.success) {
            return response.badRequest({
              body: {
                message: `Invalid reference_data for evaluator "${
                  entry.definition.name
                }": ${z.prettifyError(parsed.error)}`,
              },
            });
          }
          entry.parsedReferenceData = parsed.data as Record<string, unknown>;
        }

        const coreContext = await context.core;
        const traceAccessor = createTraceAccessor({
          traceId,
          esClient: coreContext.elasticsearch.client.asInternalUser,
        });

        const activeProfile = subject.instrumentation?.profile ?? 'elastic-inference';
        const resolvedMapping = getInstrumentationProfile(activeProfile);

        let round: Awaited<ReturnType<typeof awaitTraceReady>>;
        try {
          round = await awaitTraceReady(traceAccessor, resolvedMapping, activeProfile, logger);
        } catch (error) {
          if (error instanceof TraceReadinessError) {
            return response.notFound({ body: { message: String(error) } });
          }
          throw error;
        }

        let inferenceStartPromise: ReturnType<RouteDependencies['getInferenceStart']> | undefined;
        const inferenceClientByConnectorId = new Map<string, BoundInferenceClient>();
        const getInferenceClient = async (
          connectorId: string
        ): Promise<BoundInferenceClient | undefined> => {
          const cachedClient = inferenceClientByConnectorId.get(connectorId);
          if (cachedClient) {
            return cachedClient;
          }

          if (!getInferenceStart) {
            logger.error('Inference start contract is not configured');
            return undefined;
          }

          if (!inferenceStartPromise) {
            inferenceStartPromise = getInferenceStart();
          }

          const inference = await inferenceStartPromise;
          const inferenceClient = inference.getClient({
            request,
            bindTo: { connectorId },
          });
          inferenceClientByConnectorId.set(connectorId, inferenceClient);

          return inferenceClient;
        };

        const results: EvaluateResponse['results'] = [];
        for (const { config, definition, parsedReferenceData } of resolvedEvaluators) {
          if (definition.evidenceSchema) {
            const evidenceParsed = definition.evidenceSchema.safeParse(round);
            if (!evidenceParsed.success) {
              results.push({
                status: 'error',
                evaluator: {
                  name: definition.name,
                  version: definition.version,
                  kind: definition.kind,
                },
                error: {
                  code: 'evidence_unmet',
                  message: `Evaluator evidence requirements not met: ${formatEvidenceSchemaIssues(
                    evidenceParsed.error
                  )}`,
                },
              });
              continue;
            }
          }

          try {
            const inferenceClient =
              definition.kind === 'llm' && config.connector_id
                ? await getInferenceClient(config.connector_id)
                : undefined;

            const result = await definition.evaluate({
              trace: traceAccessor,
              round,
              referenceData: parsedReferenceData,
              inferenceClient,
              log: logger,
            });

            results.push({
              status: 'ok',
              evaluator: {
                name: definition.name,
                version: definition.version,
                kind: definition.kind,
              },
              scores: result.scores,
            });
          } catch (error) {
            logger.error(`Failed to execute evaluator "${config.name}": ${error}`);
            results.push({
              status: 'error',
              evaluator: {
                name: definition.name,
                version: definition.version,
                kind: definition.kind,
              },
              error: { message: String(error) },
            });
          }
        }

        return response.ok({
          body: {
            results,
          },
        });
      }
    );
};
