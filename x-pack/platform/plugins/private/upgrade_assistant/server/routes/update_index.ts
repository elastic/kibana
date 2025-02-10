/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';

import { mapAnyErrorToKibanaHttpResponse } from './reindex_indices/map_any_error_to_kibana_http_response';
import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerUpdateIndexRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  const BASE_PATH = `${API_BASE_PATH}/update_index`;
  router.post(
    {
      path: `${BASE_PATH}/{index}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es and saved object clients for authorization',
        },
      },
      options: {
        access: 'public',
        summary: `Perform certain update operations on a given index. Currently supported ones are: 'blockWrite' and 'unfreeze'`,
      },
      validate: {
        params: schema.object({
          index: schema.string(),
        }),
        body: schema.object({
          operations: schema.arrayOf(
            schema.oneOf([schema.literal('blockWrite'), schema.literal('unfreeze')])
          ),
        }),
      },
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client },
      } = await core;
      const { index } = request.params;
      const { operations } = request.body;
      try {
        const esClient = client.asCurrentUser;
        for (const operation of operations) {
          switch (operation) {
            case 'blockWrite': {
              await esClient.indices.addBlock({ index, block: 'write' });
              break;
            }
            case 'unfreeze': {
              await esClient.indices.unfreeze({ index });
              break;
            }
          }
        }

        return response.ok();
      } catch (err) {
        if (err instanceof errors.ResponseError) {
          return handleEsError({ error: err, response });
        }

        return mapAnyErrorToKibanaHttpResponse(err);
      }
    })
  );
}
