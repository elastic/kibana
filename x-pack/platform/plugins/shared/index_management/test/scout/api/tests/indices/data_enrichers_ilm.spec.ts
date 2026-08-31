/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { Index } from '../../../../../common';
import { apiTest, deleteIndices, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = '.index-management-api-ilm-enricher';
const POLICY_NAME = 'index-management-api-ilm-policy';
const ROLLOVER_ALIAS = 'index-management-api-ilm-alias';

// ILM does not run on serverless, so its data enricher has nothing to report there.
apiTest.describe('Indices ILM data enricher API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  const getIndex = async (apiClient: ApiClientFixture) => {
    const response = await apiClient.get(`${API_BASE_PATH}/indices`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    return (response.body as Index[]).find(({ name }) => name === INDEX_NAME);
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteIndices(esClient, INDEX_NAME);
    await esClient.indices.create({ index: INDEX_NAME, settings: { hidden: true } });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteIndices(esClient, INDEX_NAME);
    await esClient.ilm.deleteLifecycle({ name: POLICY_NAME }, { ignore: [404] });
  });

  apiTest('reports the ILM policy of a managed index', async ({ apiClient, esClient }) => {
    await esClient.ilm.putLifecycle({
      name: POLICY_NAME,
      policy: { phases: { hot: { min_age: '1d', actions: { set_priority: { priority: 100 } } } } },
    });
    await esClient.indices.putSettings({
      index: INDEX_NAME,
      settings: { lifecycle: { name: POLICY_NAME, rollover_alias: ROLLOVER_ALIAS } },
    });

    expect((await getIndex(apiClient))?.ilm).toMatchObject({ policy: POLICY_NAME });
  });

  apiTest('reports ILM data for an unmanaged index', async ({ apiClient }) => {
    const ilm = (await getIndex(apiClient))?.ilm;

    expect(ilm?.index).toBe(INDEX_NAME);
    expect(ilm?.managed).toBe(false);
  });
});
