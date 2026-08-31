/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { TemplateDeserialized } from '../../../../../common';
import { apiTest, deleteTemplate, getTemplatePayload, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-index-mode-template';
const INDEX_PATTERNS = ['index-management-api-index-mode-pattern*'];

apiTest.describe('Index templates index mode API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  let serverless: boolean;

  const createTemplate = (apiClient: ApiClientFixture) =>
    apiClient.post(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify(
        getTemplatePayload({
          name: TEMPLATE_NAME,
          indexPatterns: INDEX_PATTERNS,
          indexMode: 'standard',
          serverless,
        })
      ),
    });

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    serverless = config.serverless;
  });

  apiTest.beforeEach(async ({ apiClient, esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
    expect(await createTemplate(apiClient)).toHaveStatusCode(200);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest('lists an index template carrying its index mode', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const template = (response.body.templates as TemplateDeserialized[]).find(
      ({ name }) => name === TEMPLATE_NAME
    );
    expect(template?.indexMode).toBe('standard');
  });

  apiTest('returns an index template carrying its index mode', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}?legacy=false`,
      {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.indexMode).toBe('standard');
  });
});
