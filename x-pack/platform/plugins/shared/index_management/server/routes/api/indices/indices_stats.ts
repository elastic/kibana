/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerIndicesStats({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/indices_stats'),
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
        // await new Promise((resolve) => setTimeout(resolve, 10000));
        const resp = await client.asCurrentUser.indices.stats({
          // todo does this need to be *,.*
          index: '*', // indexNamesString,
          expand_wildcards: ['hidden', 'all'],
          forbid_closed_indices: false,
          metric: ['docs', 'store'],
        });
        return response.ok({ body: resp });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
