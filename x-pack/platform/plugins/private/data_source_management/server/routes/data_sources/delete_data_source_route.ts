/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { DATA_SOURCE_BY_ID_ROUTE_PATH } from '../../../common';
import { DataSourcesClient } from '../../data_sources_client';

export function registerDeleteDataSourceRoute(router: IRouter): void {
  router.delete(
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
        summary: i18n.translate('dataSourceManagement.routes.deleteDataSource.summary', {
          defaultMessage: 'Delete a data source by id',
        }),
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      const { id } = request.params;
      const { client } = (await context.core).elasticsearch;
      const dataSourcesClient = new DataSourcesClient(client.asCurrentUser);
      const body = await dataSourcesClient.delete(id);
      return response.ok({ body });
    })
  );
}
