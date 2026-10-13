/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidTraceId } from '@opentelemetry/api';
import {
  API_VERSIONS,
  EVALS_RESOLVE_INSTRUMENTATION_URL,
  INTERNAL_API_ACCESS,
  ResolveInstrumentationRequestBody,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import {
  getRecommendedInstrumentationProfile,
  hasTraceDocuments,
  probeProfiles,
} from '../../evaluators/evidence/evidence_service';
import { createTraceAccessor } from '../../evaluators/trace_accessor';
import { getNoTraceDocumentsMessage } from '../../evaluators/trace_readiness_errors';
import type { RouteDependencies } from '../register_routes';

export const registerResolveInstrumentationRoute = ({ router }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_RESOLVE_INSTRUMENTATION_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Probe instrumentation profiles for a trace',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ResolveInstrumentationRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { trace_id: traceId } = request.body;
        if (!isValidTraceId(traceId)) {
          return response.badRequest({
            body: { message: 'Invalid trace_id: must be a 32-character hex string' },
          });
        }

        const coreContext = await context.core;
        const traceAccessor = createTraceAccessor({
          traceId,
          // The probed evidence carries samples of the query, response and tool calls, so
          // reading as the internal user would hand trace content to a caller who holds
          // `manage_evals` but no Elasticsearch access to the trace.
          esClient: coreContext.elasticsearch.client.asCurrentUser,
        });

        if (!(await hasTraceDocuments(traceAccessor))) {
          return response.notFound({
            body: {
              // Main's shared wording, without its `Error:` prefix: the body is already an
              // error, so the prefix only shows up doubled in the UI.
              message: getNoTraceDocumentsMessage(traceId),
            },
          });
        }

        const profiles = await probeProfiles(traceAccessor);
        const recommendedProfile = getRecommendedInstrumentationProfile(profiles);

        return response.ok({
          body: {
            profiles,
            recommended_instrumentation: recommendedProfile
              ? { profile: recommendedProfile }
              : null,
          },
        });
      }
    );
};
