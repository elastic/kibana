/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AclChange, EntryAccess } from '@kbn/ols';

import {
  createOlsHandler,
  entriesSchema,
  generalAccessSchema,
  objectParamsSchema,
  OLS_ROUTE_SECURITY,
  principalSchema,
} from './common';
import type { RouteDefinitionParams } from '../..';
import type { SecurityRequestHandlerContext } from '../../../types';

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
      path: '/internal/security/ols/{type}/{id}',
      validate: {
        params: objectParamsSchema,
        body: schema.object({
          version: versionSchema,
          general: schema.object({ access: generalAccessSchema }),
          entries: entriesSchema,
        }),
      },
      security: OLS_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createOlsHandler(params, async ({ context, request, response }) => {
      const { version, general, entries } = request.body;
      return response.ok({
        body: await changeAccess(context, request.params, version, {
          kind: 'replace',
          general,
          // Entry levels are checked against the type's policy when the change is prepared.
          entries: entries.map((entry) => ({ ...entry, access: entry.access as EntryAccess })),
        }),
      });
    })
  );

  router.post(
    {
      path: '/internal/security/ols/{type}/{id}/_claim',
      validate: {
        params: objectParamsSchema,
        body: schema.object({
          version: versionSchema,
          general: schema.maybe(schema.object({ access: generalAccessSchema })),
        }),
      },
      security: OLS_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createOlsHandler(params, async ({ context, request, response }) => {
      const { version, general } = request.body;
      return response.ok({
        body: await changeAccess(context, request.params, version, {
          kind: 'claim',
          general,
        }),
      });
    })
  );

  router.post(
    {
      path: '/internal/security/ols/{type}/{id}/_transfer',
      validate: {
        params: objectParamsSchema,
        body: schema.object({ version: versionSchema, owner: principalSchema }),
      },
      security: OLS_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createOlsHandler(params, async ({ context, request, response }) => {
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
