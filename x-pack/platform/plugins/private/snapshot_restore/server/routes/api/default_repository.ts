/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../types';
import { addBasePath } from '../helpers';

const SAVED_OBJECT_TYPE = 'sr_prototype_default_repository';
const SINGLETON_ID = 'default';

export function registerDefaultRepositoryRoutes({ router, license }: RouteDependencies) {
  // GET current default repository
  router.get(
    {
      path: addBasePath('default_repository'),
      security: {
        authz: {
          enabled: false,
          reason: 'Prototype-only route; no Elasticsearch authorization required.',
        },
      },
      validate: false,
    },
    license.guardApiRoute(async (ctx, _req, res) => {
      const { savedObjects } = await ctx.core;
      try {
        const obj = await savedObjects.client.get<{ repositoryName: string }>(
          SAVED_OBJECT_TYPE,
          SINGLETON_ID
        );
        return res.ok({ body: { repositoryName: obj.attributes.repositoryName } });
      } catch (err: any) {
        if (err?.output?.statusCode === 404 || err?.isBoom) {
          return res.ok({ body: { repositoryName: null } });
        }
        throw err;
      }
    })
  );

  // PUT (upsert) default repository
  router.put(
    {
      path: addBasePath('default_repository'),
      security: {
        authz: {
          enabled: false,
          reason: 'Prototype-only route; no Elasticsearch authorization required.',
        },
      },
      validate: {
        body: schema.object({ name: schema.string() }),
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { savedObjects } = await ctx.core;
      const { name } = req.body;

      await savedObjects.client.create<{ repositoryName: string }>(
        SAVED_OBJECT_TYPE,
        { repositoryName: name },
        { id: SINGLETON_ID, overwrite: true }
      );

      return res.ok({ body: { repositoryName: name } });
    })
  );

  // DELETE default repository (clear)
  router.delete(
    {
      path: addBasePath('default_repository'),
      security: {
        authz: {
          enabled: false,
          reason: 'Prototype-only route; no Elasticsearch authorization required.',
        },
      },
      validate: false,
    },
    license.guardApiRoute(async (ctx, _req, res) => {
      const { savedObjects } = await ctx.core;
      try {
        await savedObjects.client.delete(SAVED_OBJECT_TYPE, SINGLETON_ID);
      } catch (err: any) {
        // Ignore 404 — already cleared
        if (!(err?.output?.statusCode === 404 || err?.isBoom)) {
          throw err;
        }
      }
      return res.ok({ body: { repositoryName: null } });
    })
  );
}
