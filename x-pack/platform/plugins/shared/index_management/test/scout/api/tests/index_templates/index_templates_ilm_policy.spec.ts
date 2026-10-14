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
import { apiTest, getTemplatePayload, deleteTemplate, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-ilm-policy-template';
const INDEX_PATTERNS = ['index-management-api-ilm-policy-pattern*'];
const POLICY_NAME = 'index-management-api-ilm-policy-template-policy';

// ILM does not run on serverless.
apiTest.describe('Index templates ILM policy API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  const createTemplate = (apiClient: ApiClientFixture) => {
    const payload = getTemplatePayload({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      serverless: false,
    });
    return apiClient.post(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        ...payload,
        template: {
          ...payload.template,
          settings: { ...payload.template!.settings, index: { lifecycle: { name: POLICY_NAME } } },
        },
      }),
    });
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ apiClient, esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
    expect(await createTemplate(apiClient)).toHaveStatusCode(200);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest('lists an index template carrying its ILM policy', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const template = (response.body.templates as TemplateDeserialized[]).find(
      ({ name }) => name === TEMPLATE_NAME
    );
    expect(template?.ilmPolicy).toStrictEqual({ name: POLICY_NAME });
  });

  apiTest('returns an index template carrying its ILM policy', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}?legacy=false`,
      { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.ilmPolicy).toStrictEqual({ name: POLICY_NAME });
  });
});
