/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../types';
import { addBasePath } from '../helpers';

interface DefaultRepositorySettings {
  repositories?: {
    default_repository?: string | null;
  };
}

const defaultRepositorySchema = schema.object({
  name: schema.string({ minLength: 1 }),
});

const DEFAULT_REPOSITORY_PATH = 'persistent.repositories.default_repository';

export function registerDefaultRepositoryRoutes({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  // Get current default repository
  router.get(
    {
      path: addBasePath('default_repository'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    license.guardApiRoute(async (ctx, _req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;

      try {
        const { persistent } = await clusterClient.asCurrentUser.cluster.getSettings({
          filter_path: DEFAULT_REPOSITORY_PATH,
        });

        const { repositories }: DefaultRepositorySettings = (persistent ??
          {}) as DefaultRepositorySettings;

        return res.ok({
          body: { repositoryName: repositories?.default_repository ?? null },
        });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  // Set default repository
  router.put(
    {
      path: addBasePath('default_repository'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        query: defaultRepositorySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { name } = req.query as TypeOf<typeof defaultRepositorySchema>;

      try {
        // Ensure the repository exists before setting it as default.
        const repositoriesByName = await clusterClient.asCurrentUser.snapshot.getRepository({
          name,
        });
        if (!repositoriesByName[name]) {
          return res.notFound({ body: `Repository '${name}' does not exist.` });
        }

        const response = await clusterClient.asCurrentUser.cluster.putSettings({
          persistent: {
            repositories: {
              default_repository: name,
            },
          },
        });

        return res.ok({ body: { ...response, repositoryName: name } });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );
}
