/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  aiIndexPatternCasesPath,
  aiIndexPatternImprovementsPath,
  aiIndexPatternsPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ListImprovementsResponse,
  ListPatternCasesResponse,
  ListPatternsResponse,
} from '../../common/http_api/patterns';
import { validateAiIndexId } from '../../common/validation';
import type { CasesService } from '../cases/service';
import type { ImprovementsService } from '../improvements/service';
import type { PatternsService } from '../patterns/service';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_ID_LENGTH,
    validate: validateAiIndexId,
  }),
});

const patternKeyQuerySchema = schema.object({
  pattern_key: schema.string({ minLength: 1, maxLength: 1024 }),
});

const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

const routeOptions = {
  access: 'public' as const,
  options: { tags: ['oas-tag:context engine'], availability: { stability: 'experimental' as const } },
};

export const registerPatternRoutes = ({
  router,
  getPatternsService,
  getCasesService,
  getImprovementsService,
}: {
  router: IRouter;
  getPatternsService: () => PatternsService;
  getCasesService: () => CasesService;
  getImprovementsService: () => ImprovementsService;
}) => {
  // List detected patterns for an AI index.
  router.versioned
    .get({
      path: aiIndexPatternsPath,
      security: READ_SECURITY,
      summary: 'List patterns for an AI index',
      ...routeOptions,
    })
    .addVersion(
      { version: AI_INDEX_API_VERSION, validate: { request: { params: aiIndexIdParamsSchema } } },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const body: ListPatternsResponse = {
          patterns: await getPatternsService().list(request.params.aiIndexId),
        };
        return response.ok({ body });
      })
    );

  // List the member cases of a pattern (its suite).
  router.versioned
    .get({
      path: aiIndexPatternCasesPath,
      security: READ_SECURITY,
      summary: 'List the cases of a pattern',
      ...routeOptions,
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema, query: patternKeyQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const body: ListPatternCasesResponse = {
          cases: await getCasesService().list({ patternKey: request.query.pattern_key, size: 100 }),
        };
        return response.ok({ body });
      })
    );

  // List the improvements proposed/applied against a pattern.
  router.versioned
    .get({
      path: aiIndexPatternImprovementsPath,
      security: READ_SECURITY,
      summary: 'List the improvements for a pattern',
      ...routeOptions,
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema, query: patternKeyQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const body: ListImprovementsResponse = {
          improvements: await getImprovementsService().list(request.query.pattern_key),
        };
        return response.ok({ body });
      })
    );
};
