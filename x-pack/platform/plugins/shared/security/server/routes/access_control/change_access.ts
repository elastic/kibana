/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AclChange, EntryLevel } from '@kbn/access-control';
import { schema } from '@kbn/config-schema';

import {
  ACCESS_CONTROL_ROUTE_SECURITY,
  createAccessControlHandler,
  entriesSchema,
  generalAccessSchema,
  objectParamsSchema,
  principalSchema,
} from './common';
import type { RouteDefinitionParams } from '..';
import type { SecurityRequestHandlerContext } from '../../types';

const versionSchema = schema.string({ minLength: 1, maxLength: 1024 });

/**
 * Defines the routes that change an object's access: replace general access and named grants,
 * claim an object without an owner, and transfer ownership. Each change carries the object version
 * it was prepared against, and fails with a conflict when the object changed since.
 */
export function defineChangeAccessRoutes(params: RouteDefinitionParams) {
  const { router } = params;

  router.put(
    {
      path: '/internal/security/access_control/{type}/{id}',
      validate: {
        params: objectParamsSchema,
        body: schema.object({
          version: versionSchema,
          general_access: generalAccessSchema,
          entries: entriesSchema,
        }),
      },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(params, async ({ context, request, response }) => {
      const { version, general_access: generalAccess, entries } = request.body;
      return response.ok({
        body: await changeAccess(context, request.params, version, {
          kind: 'replace',
          general_access: generalAccess,
          // Entry levels are checked against the type's policy when the change is prepared.
          entries: entries.map((entry) => ({ ...entry, access: entry.access as EntryLevel })),
        }),
      });
    })
  );

  router.post(
    {
      path: '/internal/security/access_control/{type}/{id}/_claim',
      validate: {
        params: objectParamsSchema,
        body: schema.object({
          version: versionSchema,
          general_access: schema.maybe(generalAccessSchema),
        }),
      },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(params, async ({ context, request, response }) => {
      const { version, general_access: generalAccess } = request.body;
      return response.ok({
        body: await changeAccess(context, request.params, version, {
          kind: 'claim',
          general_access: generalAccess,
        }),
      });
    })
  );

  router.post(
    {
      path: '/internal/security/access_control/{type}/{id}/_transfer',
      validate: {
        params: objectParamsSchema,
        body: schema.object({ version: versionSchema, owner: principalSchema }),
      },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(params, async ({ context, request, response }) => {
      const { version, owner } = request.body;
      return response.ok({
        body: await changeAccess(context, request.params, version, { kind: 'transfer', owner }),
      });
    })
  );
}

/**
 * Applies a change through the request's Saved Objects client, which checks feature privileges,
 * visibility, and the change itself before the conditional write.
 */
const changeAccess = async (
  context: SecurityRequestHandlerContext,
  { type, id }: { type: string; id: string },
  version: string,
  change: AclChange
) => {
  const { savedObjects } = await context.core;
  const result = await savedObjects
    .getClient({ includedHiddenTypes: [type] })
    .changeAcl(type, id, change, { version });
  return { version: result.version, warnings: result.warnings };
};
