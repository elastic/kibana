/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

import { DATA_SETS_LIST_ROUTE_PATH, type DataSetWithName } from '../../../common';
import { DataSetsClient } from '../../data_sets_client';

export function registerListDataSetsRoute(router: IRouter): void {
  router.get(
    {
      path: DATA_SETS_LIST_ROUTE_PATH,
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
      validate: false,
    },
    router.handleLegacyErrors(async (context, _request, response) => {
      console.log('list_data_sets_route');
      const { client } = (await context.core).elasticsearch;
      const dataSetsClient = new DataSetsClient(client.asCurrentUser);
      const raw = await dataSetsClient.getAll();
      console.log('raw', raw);
      let data_sets: DataSetWithName[] = [];
      if (raw && typeof raw === 'object' && 'datasets' in raw) {
        const candidate = (raw as { datasets?: unknown }).datasets;
        data_sets = Array.isArray(candidate) ? (candidate as DataSetWithName[]) : [];
      }
      return response.ok({ body: { data_sets } });
    })
  );
}
