/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import { DATA_SOURCE_BY_ID_ROUTE_PATH } from '../../../common';
import { DataSourcesClient } from '../../data_sources_client';

import { putDataSourceBodySchema } from './put_data_source_body_schema';

export function registerPutDataSourceRoute(router: IRouter): void {
  router.put(
    {
      path: DATA_SOURCE_BY_ID_ROUTE_PATH,
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
        body: putDataSourceBodySchema,
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { id } = request.params;
      const { client } = (await context.core).elasticsearch;
      const dataSourcesClient = new DataSourcesClient(client.asCurrentUser);
      try {
        const responseBody = await dataSourcesClient.put(id, request.body);
        console.log('responseBody', responseBody);
        return response.ok();
      } catch (error) {
        return response.badRequest({
          body: {
            message: error.message,
          },
        });
      }
    })
  );
}
