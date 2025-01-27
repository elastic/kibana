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
import { categorizationExamplesProvider } from '@kbn/ml-category-validator';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { AIOPS_ANALYSIS_RUN_ORIGIN } from '@kbn/aiops-common/constants';
import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';

import type { CategorizationFieldValidationSchema } from '@kbn/aiops-log-pattern-analysis/schema';
import { wrapError } from '../error_wrapper';
import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsLicense } from '../../types';

export const routeHandlerFactory: (
  license: AiopsLicense,
  usageCounter?: UsageCounter
) => RequestHandler<unknown, unknown, CategorizationFieldValidationSchema> =
  (license, usageCounter) =>
  async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, CategorizationFieldValidationSchema>,
    response: KibanaResponseFactory
  ) => {
    const { headers } = request;
    trackAIOpsRouteUsage(
      `POST ${AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION}`,
      headers[AIOPS_ANALYSIS_RUN_ORIGIN],
      usageCounter
    );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }
    try {
      const {
        elasticsearch: { client },
      } = await context.core;

      const {
        indexPatternTitle,
        timeField,
        query,
        size,
        field,
        start,
        end,
        analyzer,
        runtimeMappings,
        indicesOptions,
        includeExamples,
      } = request.body;

      const { validateCategoryExamples } = categorizationExamplesProvider(client);
      const resp = await validateCategoryExamples(
        indexPatternTitle,
        query,
        size,
        field,
        timeField,
        start,
        end,
        analyzer ?? {},
        runtimeMappings,
        indicesOptions,
        includeExamples
      );

      return response.ok({
        body: resp,
      });
    } catch (e) {
      return response.customError(wrapError(e));
    }
  };
