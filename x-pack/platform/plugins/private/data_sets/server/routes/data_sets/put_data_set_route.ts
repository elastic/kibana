/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import { DATA_SET_BY_ID_ROUTE_PATH } from '../../../common';
import { DataSetsClient } from '../../data_sets_client';

import { putDataSetBodySchema } from './put_data_set_body_schema';

export function registerPutDataSetRoute(router: IRouter): void {
  router.put(
    {
      path: DATA_SET_BY_ID_ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because permissions will be checked by elasticsearch',
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: putDataSetBodySchema,
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { id } = request.params;
      const { client } = (await context.core).elasticsearch;
      const dataSetsClient = new DataSetsClient(client.asCurrentUser);
      try {
        const responseBody = await dataSetsClient.put(id, request.body);
        console.log('responseBody', responseBody);
        return response.ok();
      } catch (error) {
        console.log('error', error);
        return response.badRequest({
          body: error,
        });
      }
    })
  );
}
