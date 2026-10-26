/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';

import type { AiopsUsage } from '../../lib/track_route_usage';
import type { TelemetrySchema } from './schema';

export const routeHandlerFactory: (
  aiopsUsage: AiopsUsage
) => RequestHandler<unknown, unknown, TelemetrySchema> =
  (aiopsUsage) =>
  async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, TelemetrySchema>,
    response: KibanaResponseFactory
  ) => {
    const { id, origin } = request.body;

    switch (id) {
      case AIOPS_USAGE_ID.CATEGORIZATION:
        aiopsUsage.trackCategorization(origin);
        break;
      case AIOPS_USAGE_ID.LOG_RATE_ANALYSIS:
        aiopsUsage.trackLogRateAnalysis(origin);
        break;
      case AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES:
        aiopsUsage.trackLogRateAnalysisFieldCandidates(origin);
        break;
      case AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS:
        aiopsUsage.trackRenderEsqlCategorizationResults(origin);
        break;
      case AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS:
        aiopsUsage.trackRenderEsqlChangePointResults(origin);
        break;
    }

    return response.ok();
  };
