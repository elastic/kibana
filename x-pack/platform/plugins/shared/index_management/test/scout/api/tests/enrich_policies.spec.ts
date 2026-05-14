/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createEnrichIndex,
  createEnrichPolicy,
  createHeaders,
  deleteIndices,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

apiTest.describe('Index Management enrich policies API', { tag: tags.stateful.classic }, () => {
  apiTest(
    'lists, executes, and deletes policies',
    async ({ apiClient, esClient, log, samlAuth }) => {
      const indexName = uniqueName('im-enrich-index');
      const policyName = uniqueName('im-enrich-policy');

      await createEnrichIndex(esClient, indexName);
      await createEnrichPolicy({ esClient, policyName, indexName });

      try {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const api = indexManagementApi(apiClient, createHeaders(cookieHeader)).enrichPolicies;

        const listResponse = await api.getAll();
        expect(listResponse).toHaveStatusCode(200);
        expect(listResponse.body).toStrictEqual(
          expect.arrayContaining([
            {
              enrichFields: ['firstName'],
              matchField: 'email',
              name: policyName,
              sourceIndices: [indexName],
              type: 'match',
            },
          ])
        );

        expect(await api.execute(policyName)).toHaveStatusCode(200);

        await expect
          .poll(async () => (await api.delete(policyName)).statusCode, { timeout: 10000 })
          .toBe(200);
      } finally {
        await deleteIndices(esClient, [indexName], log);
        await esClient.enrich.deletePolicy({ name: policyName }).catch((error) => {
          log.debug(`[Cleanup error] Error deleting enrich policy: ${error.message}`);
        });
      }
    }
  );
});
