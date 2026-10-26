/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { createExecutionContext } from '@kbn/ml-route-utils';
import { AIOPS_ANALYSIS_RUN_ORIGIN, AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import { fetchFieldCandidates } from '@kbn/aiops-log-rate-analysis/queries/fetch_field_candidates';
import { TEXT_FIELD_SAFE_LIST } from '@kbn/aiops-log-rate-analysis/queries/fetch_field_candidates';

import type { AiopsUsage } from '../../lib/track_route_usage';
import type { AiopsLicense } from '../../types';

/**
 * The fetch field candidates route handler returns fields suitable for log rate analysis.
 */
export function routeHandlerFactory<T extends ApiVersion>(
  version: '1',
  license: AiopsLicense,
  coreStart: CoreStart,
  aiopsUsage: AiopsUsage
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema<T>> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema<T>>,
    response: KibanaResponseFactory
  ) => {
    const { body, events } = request;

    aiopsUsage.trackLogRateAnalysisFieldCandidates(request.headers[AIOPS_ANALYSIS_RUN_ORIGIN]);

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const executionContext = createExecutionContext(coreStart, AIOPS_PLUGIN_ID, request.route.path);

    return await coreStart.executionContext.withContext(executionContext, async () => {
      const controller = new AbortController();
      const abortSignal = controller.signal;

      events.aborted$.subscribe(() => {
        controller.abort();
      });
      events.completed$.subscribe(() => {
        controller.abort();
      });

      const textFieldCandidatesOverrides = TEXT_FIELD_SAFE_LIST;

      try {
        const fieldCandidates = await fetchFieldCandidates({
          esClient,
          abortSignal,
          arguments: {
            ...body,
            textFieldCandidatesOverrides,
          },
        });

        return response.ok({ body: fieldCandidates });
      } catch (e) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Unable to fetch field candidates.',
          },
        });
      }
    });
  };
}
