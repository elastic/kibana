/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { buildStrictRouteValidationWithZod } from '../../utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import {
  CustomResolutionRuleNotFoundError,
  InvalidCustomResolutionRuleError,
} from '../../../../domain/errors';
import {
  customRuleCreateBodySchema,
  customRuleIdParamsSchema,
  customRulePreviewBodySchema,
  customRuleUpdateBodySchema,
} from './schemas';

// Internal routes stay out of the public API reference; this is an
// engagement-only escape hatch, documented only in an internal runbook.
const ROUTE_CONFIG = {
  access: 'internal',
  security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
  enableQueryVersion: true,
} as const;

const toErrorResponse = (
  error: unknown,
  res: KibanaResponseFactory,
  logger: Logger
): IKibanaResponse => {
  if (error instanceof InvalidCustomResolutionRuleError) {
    return res.badRequest({ body: { message: error.message } });
  }
  if (error instanceof CustomResolutionRuleNotFoundError) {
    return res.notFound({ body: { message: error.message } });
  }
  logger.error(error instanceof Error ? error : String(error));
  throw error;
};

export function registerCustomResolutionRulesRoutes(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES,
      summary: 'List custom entity resolution rules',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v2, validate: false },
      wrapMiddlewares(
        async (ctx, _req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            return res.ok({ body: { rules: await customResolutionRulesClient.list() } });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );

  router.versioned
    .post({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES,
      summary: 'Create a custom entity resolution rule',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: { body: buildStrictRouteValidationWithZod(customRuleCreateBodySchema) },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            return res.ok({ body: await customResolutionRulesClient.create(req.body) });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );

  router.versioned
    .post({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULES_PREVIEW,
      summary: 'Preview what a custom entity resolution rule would link',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: { body: buildStrictRouteValidationWithZod(customRulePreviewBodySchema) },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            return res.ok({ body: await customResolutionRulesClient.preview(req.body) });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );

  router.versioned
    .get({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE,
      summary: 'Get a custom entity resolution rule',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: { params: buildStrictRouteValidationWithZod(customRuleIdParamsSchema) },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            return res.ok({ body: await customResolutionRulesClient.get(req.params.id) });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );

  router.versioned
    .put({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE,
      summary: 'Update a custom entity resolution rule',
      description:
        'Partial update. Changing namespaces, filter, match_value or decline_same_namespace_duplicates makes the rule rescan from scratch on the next maintainer run.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            params: buildStrictRouteValidationWithZod(customRuleIdParamsSchema),
            body: buildStrictRouteValidationWithZod(customRuleUpdateBodySchema),
          },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            return res.ok({
              body: await customResolutionRulesClient.update(req.params.id, req.body),
            });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );

  router.versioned
    .delete({
      ...ROUTE_CONFIG,
      path: ENTITY_STORE_ROUTES.internal.RESOLUTION_CUSTOM_RULE,
      summary: 'Delete a custom entity resolution rule',
      description:
        'Deletes the rule. The next maintainer run drops its saved progress. Links the rule already made are kept.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: { params: buildStrictRouteValidationWithZod(customRuleIdParamsSchema) },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse> => {
          const { logger, customResolutionRulesClient } = await ctx.entityStore;
          try {
            await customResolutionRulesClient.delete(req.params.id);
            return res.ok({ body: { deleted: true } });
          } catch (error) {
            return toErrorResponse(error, res, logger);
          }
        },
        [enterpriseLicenseMiddleware]
      )
    );
}
