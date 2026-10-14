/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthzEnabled } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { buildStrictRouteValidationWithZod } from '../../utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import {
  RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS,
  RESOLUTION_ENTITY_STORE_PERMISSIONS,
} from '../../../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import {
  CustomResolutionRuleForbiddenError,
  CustomResolutionRuleNotFoundError,
  EntityStoreNotInstalledError,
  InvalidCustomResolutionRuleError,
} from '../../../../domain/errors';
import {
  CustomResolutionRuleCreate,
  CustomResolutionRuleIdParams,
  CustomResolutionRulePreviewRequest,
  CustomResolutionRuleUpdate,
  type CustomResolutionRulesClient,
} from '../../../../domain/resolution/rules';

export const CUSTOM_RULES_ROUTE_MIDDLEWARES = [enterpriseLicenseMiddleware] as const;

const routeConfig = (authz: AuthzEnabled) =>
  ({ access: 'internal', security: { authz }, enableQueryVersion: true } as const);

const READ = routeConfig(RESOLUTION_ENTITY_STORE_PERMISSIONS);
const MANAGE = routeConfig(RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS);

/** Maps known errors to a response; rethrows anything else after logging it. */
const toErrorResponseOrThrow = (
  error: unknown,
  res: KibanaResponseFactory,
  logger: Logger
): IKibanaResponse => {
  if (error instanceof InvalidCustomResolutionRuleError) {
    return res.badRequest({ body: { message: error.message } });
  }
  if (
    error instanceof CustomResolutionRuleNotFoundError ||
    error instanceof EntityStoreNotInstalledError
  ) {
    return res.notFound({ body: { message: error.message } });
  }
  if (error instanceof CustomResolutionRuleForbiddenError) {
    return res.forbidden({ body: { message: error.message } });
  }
  if (error instanceof Error && SavedObjectsErrorHelpers.isForbiddenError(error)) {
    return res.forbidden({
      body: {
        message: 'Not authorized to manage custom resolution rules in this space',
      },
    });
  }
  if (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) {
    return res.conflict({
      body: { message: 'The rule was changed by another request; read it again and retry' },
    });
  }
  logger.error(error instanceof Error ? error : String(error));
  throw error;
};

const withCustomRulesClient =
  <P, Q, B>(
    handler: (
      client: CustomResolutionRulesClient,
      req: KibanaRequest<P, Q, B>,
      res: KibanaResponseFactory
    ) => Promise<IKibanaResponse>
  ) =>
  async (
    ctx: EntityStoreRequestHandlerContext,
    req: KibanaRequest<P, Q, B>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> => {
    const { logger, customResolutionRulesClient } = await ctx.entityStore;
    try {
      return await handler(customResolutionRulesClient, req, res);
    } catch (error) {
      return toErrorResponseOrThrow(error, res, logger);
    }
  };

const abortSignalFor = (req: KibanaRequest): AbortSignal => {
  const controller = new AbortController();
  req.events.aborted$.subscribe(() => controller.abort());
  return controller.signal;
};

export function registerCustomResolutionRulesRoutes(router: EntityStorePluginRouter) {
  const { RESOLUTION_CUSTOM_RULES, RESOLUTION_CUSTOM_RULE, RESOLUTION_CUSTOM_RULES_PREVIEW } =
    ENTITY_STORE_ROUTES.internal;
  const version = API_VERSIONS.internal.v2;
  const idParams = buildStrictRouteValidationWithZod(CustomResolutionRuleIdParams);

  router.versioned
    .get({ ...READ, path: RESOLUTION_CUSTOM_RULES, summary: 'List custom entity resolution rules' })
    .addVersion(
      { version, validate: false },
      wrapMiddlewares(
        withCustomRulesClient(async (client, _req, res) =>
          res.ok({ body: { rules: await client.list() } })
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .post({
      ...MANAGE,
      path: RESOLUTION_CUSTOM_RULES,
      summary: 'Create a custom entity resolution rule',
    })
    .addVersion(
      {
        version,
        validate: {
          request: { body: buildStrictRouteValidationWithZod(CustomResolutionRuleCreate) },
        },
      },
      wrapMiddlewares(
        withCustomRulesClient(
          async (client, req: KibanaRequest<unknown, unknown, CustomResolutionRuleCreate>, res) =>
            res.ok({ body: await client.create(req.body) })
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .post({
      ...READ,
      path: RESOLUTION_CUSTOM_RULES_PREVIEW,
      summary: 'Preview what a custom entity resolution rule would link',
    })
    .addVersion(
      {
        version,
        validate: {
          request: { body: buildStrictRouteValidationWithZod(CustomResolutionRulePreviewRequest) },
        },
      },
      wrapMiddlewares(
        withCustomRulesClient(
          async (
            client,
            req: KibanaRequest<unknown, unknown, CustomResolutionRulePreviewRequest>,
            res
          ) => res.ok({ body: await client.preview(req.body, abortSignalFor(req)) })
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .get({ ...READ, path: RESOLUTION_CUSTOM_RULE, summary: 'Get a custom entity resolution rule' })
    .addVersion(
      { version, validate: { request: { params: idParams } } },
      wrapMiddlewares(
        withCustomRulesClient(async (client, req: KibanaRequest<{ id: string }>, res) =>
          res.ok({ body: await client.get(req.params.id) })
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .put({
      ...MANAGE,
      path: RESOLUTION_CUSTOM_RULE,
      summary: 'Update a custom entity resolution rule',
      description:
        'Partial update. Changing namespaces, filter, match_value or decline_same_namespace_duplicates makes the rule rescan from scratch on the next maintainer run.',
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            params: idParams,
            body: buildStrictRouteValidationWithZod(CustomResolutionRuleUpdate),
          },
        },
      },
      wrapMiddlewares(
        withCustomRulesClient(
          async (
            client,
            req: KibanaRequest<{ id: string }, unknown, CustomResolutionRuleUpdate>,
            res
          ) => res.ok({ body: await client.update(req.params.id, req.body) })
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .delete({
      ...MANAGE,
      path: RESOLUTION_CUSTOM_RULE,
      summary: 'Delete a custom entity resolution rule',
      description:
        'Deletes the rule. The next maintainer run drops its saved progress. Links the rule already made are kept.',
    })
    .addVersion(
      { version, validate: { request: { params: idParams } } },
      wrapMiddlewares(
        withCustomRulesClient(async (client, req: KibanaRequest<{ id: string }>, res) => {
          await client.delete(req.params.id);
          return res.ok({ body: { deleted: true } });
        }),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );
}
