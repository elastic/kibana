/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerGetFailureStoreSettingsRoute({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/data_streams/failure_store_settings'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { query: schema.object({}, { unknowns: 'allow' }) },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const { persistent, defaults } = await client.asInternalUser.cluster.getSettings({
          include_defaults: true,
        });

        return response.ok({
          body: {
            enabled:
              persistent?.data_streams?.failure_store?.enabled ??
              defaults?.data_streams?.failure_store?.enabled,
            defaultRetentionPeriod:
              persistent?.data_streams?.lifecycle?.retention?.failures_default ??
              defaults?.data_streams?.lifecycle?.retention?.failures_default,
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
