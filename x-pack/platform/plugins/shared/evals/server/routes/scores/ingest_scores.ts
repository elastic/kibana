/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_SCORES_URL,
  INTERNAL_API_ACCESS,
  IngestScoresRequestBody,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const SCORE_INGEST_PAYLOAD_CAP_BYTES = 5 * 1024 * 1024;

const getResponseStatusCode = ({
  ingested,
  conflicted,
  failed,
}: {
  ingested: number;
  conflicted: number;
  failed: Array<{ status: number }>;
}): 200 | 207 | 400 | 429 | 500 => {
  if (failed.length === 0) {
    return 200;
  }

  const landed = ingested + conflicted;
  if (landed > 0) {
    return 207;
  }

  if (failed.every(({ status }) => status === 400)) {
    return 400;
  }

  if (failed.some(({ status }) => status === 429)) {
    return 429;
  }

  return 500;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const registerIngestScoresRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      options: {
        body: {
          maxBytes: SCORE_INGEST_PAYLOAD_CAP_BYTES,
        },
      },
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Ingest evaluation scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(IngestScoresRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const evalsContext = await context.evals;
          const result = await evalsContext.evaluationScoreService.write(request.body);

          const statusCode = getResponseStatusCode(result);

          if (statusCode === 200) {
            return response.ok({
              body: result,
            });
          }

          return response.custom({
            statusCode,
            body: result,
          });
        } catch (error) {
          logger.error(`Failed to ingest evaluation scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: getErrorMessage(error),
            },
          });
        }
      }
    );
};
