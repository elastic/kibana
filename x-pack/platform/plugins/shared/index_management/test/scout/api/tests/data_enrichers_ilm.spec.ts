/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, createHeaders, deleteIndices, indexManagementApi, uniqueName } from '../fixtures';

apiTest.describe('Index Management ILM data enrichers API', { tag: tags.stateful.classic }, () => {
  const indices: string[] = [];
  const policies: string[] = [];

  apiTest.afterEach(async ({ esClient, log }) => {
    await deleteIndices(esClient, indices.splice(0), log);
    for (const policy of policies.splice(0)) {
      await esClient.ilm
        .deleteLifecycle({ name: policy })
        .catch((error) => log.debug(`[Cleanup error] Error deleting ILM policy: ${error.message}`));
    }
  });

  apiTest('fetches ILM data for managed indices', async ({ apiClient, esClient, requestAuth }) => {
    const index = `.${uniqueName('im-ilm-managed')}`;
    const alias = uniqueName('im-ilm-alias');
    const policy = uniqueName('im-ilm-policy');
    indices.push(index);
    policies.push(policy);

    await esClient.indices.create({ index, settings: { hidden: true } });
    await esClient.ilm.putLifecycle({
      name: policy,
      policy: {
        phases: {
          hot: {
            min_age: '1d',
            actions: {
              set_priority: {
                priority: 100,
              },
            },
          },
        },
      },
    });
    await esClient.indices.putSettings({
      index,
      settings: {
        lifecycle: {
          name: policy,
          rollover_alias: alias,
        },
      },
    });

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(
      apiClient,
      createHeaders(apiKeyHeader)
    ).indices.list();

    expect(response).toHaveStatusCode(200);
    const foundIndex = response.body.find(({ name }: { name: string }) => name === index);
    expect(foundIndex.ilm.policy).toBe(policy);
  });

  apiTest(
    'returns ILM data for unmanaged indices',
    async ({ apiClient, esClient, requestAuth }) => {
      const index = `.${uniqueName('im-ilm-unmanaged')}`;
      indices.push(index);

      await esClient.indices.create({ index, settings: { hidden: true } });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const response = await indexManagementApi(
        apiClient,
        createHeaders(apiKeyHeader)
      ).indices.list();

      expect(response).toHaveStatusCode(200);
      const foundIndex = response.body.find(({ name }: { name: string }) => name === index);
      expect(foundIndex.ilm.index).toBe(index);
      expect(foundIndex.ilm.managed).toBe(false);
    }
  );
});
