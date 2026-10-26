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
import { API_VERSIONS, ENTITY_STORE_ROUTES, getErrorMessage } from '../../../../../common';
import {
  getEsErrorReason,
  isEsResponseErrorWithStatus,
} from '../../../../infra/elasticsearch/es_errors';
import {
  RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS,
  RESOLUTION_ENTITY_STORE_PERMISSIONS,
} from '../../../constants';
import type { EntityStorePluginRouter, EntityStoreRequestHandlerContext } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import {
  MissingEntityIndexPrivilegeError,
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

const CUSTOM_RULES_ROUTE_MIDDLEWARES = [enterpriseLicenseMiddleware] as const;

const routeConfig = (authz: AuthzEnabled) =>
  ({ access: 'internal', security: { authz }, enableQueryVersion: true } as const);

const READ_ROUTE_CONFIG = routeConfig(RESOLUTION_ENTITY_STORE_PERMISSIONS);
const MANAGE_ROUTE_CONFIG = routeConfig(RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS);

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
  if (error instanceof MissingEntityIndexPrivilegeError) {
    return res.forbidden({ body: { message: error.message } });
  }
  if (error instanceof Error && SavedObjectsErrorHelpers.isForbiddenError(error)) {
    return res.forbidden({
      body: {
        message: 'Not authorized to access custom resolution rules in this space',
      },
    });
  }
  if (error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error)) {
    return res.conflict({
      body: { message: 'The rule was changed by another request; read it again and retry' },
    });
  }
  if (isEsResponseErrorWithStatus(error, 403)) {
    return res.forbidden({ body: { message: getEsErrorReason(error) } });
  }
  logger.error(error instanceof Error ? error : String(error));
  throw error;
};

const abortSignalFor = (req: KibanaRequest): AbortSignal => {
  const controller = new AbortController();
  req.events.aborted$.subscribe(() => controller.abort());
  return controller.signal;
};

const CLIENT_CLOSED_REQUEST_STATUS = 499;

/**
 * With `abortOnDisconnect`, the handler gets a signal that fires when the client
 * disconnects, and the resulting error is not logged as a server error.
 */
const withCustomRulesClient =
  <P, Q, B>(
    handler: (
      client: CustomResolutionRulesClient,
      req: KibanaRequest<P, Q, B>,
      res: KibanaResponseFactory,
      signal?: AbortSignal
    ) => Promise<IKibanaResponse>,
    { abortOnDisconnect = false } = {}
  ) =>
  async (
    ctx: EntityStoreRequestHandlerContext,
    req: KibanaRequest<P, Q, B>,
    res: KibanaResponseFactory
  ): Promise<IKibanaResponse> => {
    const { logger, customResolutionRulesClient } = await ctx.entityStore;
    const signal = abortOnDisconnect ? abortSignalFor(req) : undefined;
    try {
      return await handler(customResolutionRulesClient, req, res, signal);
    } catch (error) {
      if (signal?.aborted) {
        logger.debug(
          `Custom resolution rules request aborted by the client: ${getErrorMessage(error)}`
        );
        return res.customError({
          statusCode: CLIENT_CLOSED_REQUEST_STATUS,
          body: { message: 'Request aborted' },
        });
      }
      return toErrorResponseOrThrow(error, res, logger);
    }
  };

export function registerCustomResolutionRulesRoutes(router: EntityStorePluginRouter) {
  const { RESOLUTION_CUSTOM_RULES, RESOLUTION_CUSTOM_RULE, RESOLUTION_CUSTOM_RULES_PREVIEW } =
    ENTITY_STORE_ROUTES.internal;
  const version = API_VERSIONS.internal.v2;
  const idParams = buildStrictRouteValidationWithZod(CustomResolutionRuleIdParams);

  router.versioned
    .get({
      ...READ_ROUTE_CONFIG,
      path: RESOLUTION_CUSTOM_RULES,
      summary: 'List custom entity resolution rules',
    })
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
      ...MANAGE_ROUTE_CONFIG,
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
      ...READ_ROUTE_CONFIG,
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
            res,
            signal
          ) => res.ok({ body: await client.preview(req.body, signal) }),
          { abortOnDisconnect: true }
        ),
        CUSTOM_RULES_ROUTE_MIDDLEWARES
      )
    );

  router.versioned
    .get({
      ...READ_ROUTE_CONFIG,
      path: RESOLUTION_CUSTOM_RULE,
      summary: 'Get a custom entity resolution rule',
    })
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
      ...MANAGE_ROUTE_CONFIG,
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
      ...MANAGE_ROUTE_CONFIG,
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
