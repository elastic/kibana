/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';

import { API_BASE_PATH, ILM_API_ROLE, getHeaders, getResourceName } from '../fixtures/constants';

apiTest.describe('Index Lifecycle Management - explain', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  const hiddenIndexName = `.${getResourceName('hidden-explain')}`;

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(ILM_API_ROLE);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.indices.delete({ index: hiddenIndexName }, { ignore: [404] });
  });

  apiTest('includes hidden indices in the explain response', async ({ apiClient, esClient }) => {
    await esClient.indices.create({ index: hiddenIndexName, settings: { hidden: true } });

    const response = await apiClient.get(`${API_BASE_PATH}/explain`, {
      headers: getHeaders(credentials),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(Object.keys(response.body.indices)).toContain(hiddenIndexName);
  });
});
