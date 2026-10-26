/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { isValidTraceId } from '@opentelemetry/api';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { isResponseError } from '@kbn/es-errors';
import {
  API_VERSIONS,
  EVALS_TRACE_EVIDENCE_URL,
  GetTraceEvidenceRequestParams,
  GetTraceEvidenceRequestQuery,
  INTERNAL_API_ACCESS,
  type GetTraceEvidenceResponse,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  extractProfilesEvidence,
  extractSelectedEvidence,
  hasResolvedEvidence,
  hasTraceDocuments,
  type InstrumentationProfileProbeResult,
} from '../../evaluators/evidence/evidence_service';
import type { InstrumentationProfile } from '../../evaluators/evidence/types';
import {
  awaitTraceReady,
  TraceReadinessError,
  type AwaitTraceReadyResult,
} from '../../evaluators/trace_readiness';
import { createTraceAccessor } from '../../evaluators/trace_accessor';
import { getNoTraceDocumentsMessage } from '../../evaluators/trace_readiness_errors';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

const toResolvedResponse = ({
  traceId,
  result,
}: {
  traceId: string;
  result: Omit<AwaitTraceReadyResult, 'readiness'> & {
    readiness: AwaitTraceReadyResult['readiness'] | 'immediate';
  };
}): GetTraceEvidenceResponse => ({
  status: 'resolved',
  trace_id: traceId,
  profile: result.profile,
  evidence: result.round,
  ...(result.readiness === 'best_effort' ? { best_effort: true as const } : {}),
});

const toProfileDiagnostics = (profiles: InstrumentationProfileProbeResult[]) =>
  profiles.map(({ profile, evidence }) => ({
    profile,
    evidence: {
      user_query: evidence.user_query.status,
      agent_response: evidence.agent_response.status,
      tool_calls: evidence.tool_calls.status,
    },
  }));

const toUnresolvedResponse = ({
  traceId,
  profile,
  profiles,
}: {
  traceId: string;
  profile: InstrumentationProfile | null;
  profiles: InstrumentationProfileProbeResult[];
}): GetTraceEvidenceResponse => ({
  status: 'unresolved',
  trace_id: traceId,
  profile,
  profile_diagnostics: toProfileDiagnostics(profiles),
});

export const registerGetTraceEvidenceRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_TRACE_EVIDENCE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get normalized trace evidence',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetTraceEvidenceRequestParams),
            query: buildRouteValidationWithZod(GetTraceEvidenceRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const { traceId } = request.params;
        const { profile, wait } = request.query;
        if (!isValidTraceId(traceId)) {
          return response.badRequest({
            body: { message: 'Invalid traceId: must be a 32-character hex string' },
          });
        }

        try {
          const coreContext = await context.core;
          const traceAccessor = createTraceAccessor({
            traceId,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
          });

          if (wait !== 'none') {
            try {
              const result = await awaitTraceReady(traceAccessor, { mode: wait, profile }, logger);
              return response.ok({
                body: toResolvedResponse({ traceId, result }),
              });
            } catch (error) {
              if (error instanceof TraceReadinessError) {
                if (error.kind === 'not_ready') {
                  return response.notFound({ body: { message: error.message } });
                }

                return response.ok({
                  body: toUnresolvedResponse({
                    traceId,
                    profile: profile ?? null,
                    profiles: error.profiles,
                  }),
                });
              }
              throw error;
            }
          }

          if (!(await hasTraceDocuments(traceAccessor))) {
            return response.notFound({
              body: {
                message: getNoTraceDocumentsMessage(traceId),
              },
            });
          }

          const selection = await extractSelectedEvidence(traceAccessor, profile);
          if (selection.selected && hasResolvedEvidence(selection.selected.round)) {
            return response.ok({
              body: toResolvedResponse({
                traceId,
                result: { ...selection.selected, readiness: 'immediate' },
              }),
            });
          }

          const profiles = selection.profiles ?? (await extractProfilesEvidence(traceAccessor));
          return response.ok({
            body: toUnresolvedResponse({
              traceId,
              profile: profile ?? null,
              profiles,
            }),
          });
        } catch (error) {
          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Get trace evidence',
          });
          if (tooLarge) {
            return tooLarge;
          }

          if (isResponseError(error) && error.statusCode === 403) {
            return response.forbidden({
              body: {
                message:
                  'Insufficient Elasticsearch privileges to read trace evidence. Grant read access to traces-* and logs-*.',
              },
            });
          }

          if (
            error instanceof EsErrors.ElasticsearchClientError &&
            isRetryableEsClientError(error)
          ) {
            logger.warn(`Get trace evidence temporarily unavailable: ${error.message}`);
            return response.customError({
              statusCode: 503,
              body: { message: 'Trace evidence is temporarily unavailable' },
            });
          }

          logger.error(`Failed to get trace evidence: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get trace evidence' },
          });
        }
      }
    );
};
