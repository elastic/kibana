/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AccessPolicy, AclChangeError, MAX_ACL_ENTRIES } from '@kbn/access-control';
import { schema } from '@kbn/config-schema';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';

import type { RouteDefinitionParams } from '..';
import type { ScopedAclService } from '../../access_control/scoped_acl_service';
import { wrapIntoCustomErrorResponse } from '../../errors';
import type { SecurityRequestHandlerContext } from '../../types';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Every access control route authorizes through the access control service, using the type's
 * registered policy and the caller's feature privileges.
 */
export const ACCESS_CONTROL_ROUTE_SECURITY = {
  authz: {
    enabled: false,
    reason:
      'Authorized by the access control service using the registered access policy and feature privileges.',
  },
} as const;

const idSchema = schema.string({ minLength: 1, maxLength: 1024 });

export const typeParamsSchema = schema.object({ type: idSchema });
export const objectParamsSchema = schema.object({ type: idSchema, id: idSchema });

export const principalSchema = schema.object({
  type: schema.oneOf([schema.literal('user'), schema.literal('service_account')]),
  id: idSchema,
});

// The type's policy narrows the levels further.
export const generalAccessSchema = schema.oneOf([
  schema.literal('none'),
  schema.literal('view'),
  schema.literal('use'),
  schema.literal('edit'),
]);

export const entriesSchema = schema.arrayOf(
  schema.object({
    type: schema.oneOf([schema.literal('user'), schema.literal('service_account')]),
    id: idSchema,
    access: schema.oneOf([
      schema.literal('view'),
      schema.literal('use'),
      schema.literal('edit'),
      schema.literal('manage'),
    ]),
  }),
  { maxSize: MAX_ACL_ENTRIES }
);

export interface AccessControlHandlerContext<P, B> {
  context: SecurityRequestHandlerContext;
  request: KibanaRequest<P, unknown, B>;
  response: KibanaResponseFactory;
  aclService: ScopedAclService;
  policy: AccessPolicy;
  spaceId: string;
}

/**
 * Wraps an access control route handler. A type without an access policy is not found, every route
 * except the policy route is a bad request while object-level security is disabled, and errors map
 * to responses whose messages never include another principal's data.
 */
export const createAccessControlHandler = <P extends { type: string }, B>(
  { getAclService, getSpaceId }: Pick<RouteDefinitionParams, 'getAclService' | 'getSpaceId'>,
  handler: (params: AccessControlHandlerContext<P, B>) => Promise<IKibanaResponse>,
  { allowDisabled = false }: { allowDisabled?: boolean } = {}
) =>
  createLicensedRouteHandler(
    async (
      context: SecurityRequestHandlerContext,
      request: KibanaRequest<P, unknown, B>,
      response: KibanaResponseFactory
    ) => {
      const aclService = getAclService().asScoped(request);
      const policy = aclService.getPolicy(request.params.type);
      if (!policy) {
        return response.notFound();
      }

      if (!allowDisabled && !aclService.isEnabled()) {
        return response.badRequest({ body: { message: 'Access control is disabled.' } });
      }

      try {
        return await handler({
          context,
          request,
          response,
          aclService,
          policy,
          spaceId: getSpaceId(request),
        });
      } catch (error) {
        return error instanceof AclChangeError
          ? response.customError({
              statusCode: STATUS_CODES[error.code],
              body: { message: error.message },
            })
          : response.customError(wrapIntoCustomErrorResponse(error));
      }
    }
  );

const STATUS_CODES = { bad_request: 400, forbidden: 403, conflict: 409 } as const;
