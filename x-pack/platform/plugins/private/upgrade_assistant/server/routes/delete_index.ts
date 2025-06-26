/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import type { RouteDependencies } from '../types';

export function registerDeleteIndexRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.delete(
    {
      path: `${API_BASE_PATH}/delete_index/{index}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Remove an index from the cluster. This operation is irreversible and should be used with caution.`,
      },
      validate: {
        params: schema.object({
          index: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client },
      } = await core;
      const { index } = request.params;
      try {
        await client.asCurrentUser.indices.delete({ index });
        return response.ok();
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }
        throw err;
      }
    })
  );
}
