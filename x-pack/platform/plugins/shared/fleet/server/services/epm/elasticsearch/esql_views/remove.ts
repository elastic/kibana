/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { MAX_CONCURRENT_ESQL_VIEWS_OPERATIONS } from '../../../../constants';

export async function deleteEsqlViews(esClient: ElasticsearchClient, idsToDelete: string[]) {
  await pMap(
    idsToDelete,
    async (id) =>
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `/_query/view/${id}`,
        },
        {
          ignore: [404, 400],
        }
      ),
    {
      concurrency: MAX_CONCURRENT_ESQL_VIEWS_OPERATIONS,
    }
  );
}
