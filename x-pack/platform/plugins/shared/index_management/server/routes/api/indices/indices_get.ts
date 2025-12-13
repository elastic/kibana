/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

export function registerIndicesGet({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/indices_get'),
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
        const indices = await client.asCurrentUser.indices.get({
          index: '*', // indexNamesString,
          expand_wildcards: ['hidden', 'all'],
          // only get specified index properties from ES to keep the response under 536MB
          // node.js string length limit: https://github.com/nodejs/node/issues/33960
          filter_path: [
            '*.aliases',
            '*.settings.index.number_of_shards',
            '*.settings.index.number_of_replicas',
            '*.settings.index.frozen',
            '*.settings.index.hidden',
            '*.settings.index.mode',
            '*.data_stream',
          ],
          // for better performance only compute aliases and settings of indices but not mappings
          features: ['aliases', 'settings'],
        });
        return response.ok({ body: indices });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
