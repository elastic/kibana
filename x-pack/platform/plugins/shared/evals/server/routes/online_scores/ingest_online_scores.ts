/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_URL,
  INTERNAL_API_ACCESS,
  IngestOnlineScoresRequestBody,
} from '@kbn/evals-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { OnlineScoreDocument } from '../../storage/scores/online_score_service';
import type { RouteDependencies } from '../register_routes';
import { getEsErrorLogDetails } from '../utils/get_es_error_log_details';

const ONLINE_SCORE_INGEST_PAYLOAD_CAP_BYTES = 5 * 1024 * 1024;

export const registerIngestOnlineScoresRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_ONLINE_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      options: {
        body: {
          maxBytes: ONLINE_SCORE_INGEST_PAYLOAD_CAP_BYTES,
        },
      },
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Ingest online evaluation scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(IngestOnlineScoresRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { monitor, trace_id: traceId, connector_id: connectorId, results } = request.body;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const evalsContext = await context.evals;

          const failedEvaluators = results.filter((result) => result.status === 'error').length;
          const documents: Array<Omit<OnlineScoreDocument, '@timestamp'>> = results.flatMap(
            (result) => {
              if (result.status !== 'ok' || !result.scores?.length) {
                return [];
              }

              return result.scores.map((score) => ({
                space_ids: [spaceId],
                monitor,
                trace_id: traceId,
                connector_id: connectorId,
                evaluator: result.evaluator,
                score: {
                  name: score.name,
                  value: score.score,
                  label: score.label,
                  explanation: score.explanation,
                  metadata: score.metadata,
                },
              }));
            }
          );

          const bulkResult = await evalsContext.onlineScoreService.bulkCreate(documents);
          if (bulkResult.errors.length > 0) {
            logger.error(
              `Failed to ingest online evaluation scores: ${bulkResult.errors
                .map((error) => `[${error.status}] ${error.reason}`)
                .join('; ')}`
            );
            return response.customError({
              statusCode: 500,
              body: {
                message: 'Failed to ingest online evaluation scores',
              },
            });
          }

          return response.ok({
            body: {
              created: bulkResult.created,
              skipped: bulkResult.skipped,
              failed_evaluators: failedEvaluators,
            },
          });
        } catch (error) {
          const { message, meta } = getEsErrorLogDetails(error);
          logger.error(`Failed to ingest online evaluation scores: ${message}`, meta);
          return response.customError({
            statusCode: 500,
            body: {
              message: 'Failed to ingest online evaluation scores',
            },
          });
        }
      }
    );
};
