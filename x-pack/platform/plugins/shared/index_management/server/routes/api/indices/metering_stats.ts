/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerMeteringStats({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/metering_stats'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const data = await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
          method: 'GET',
          path: `/_metering/stats/` + '*', // indexNamesString,
        });
        return response.ok({ body: data });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
