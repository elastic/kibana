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
import {
  apiTest,
  deleteLegacyTemplate,
  getTemplatePayload,
  getTemplateVersion,
  templateExists,
  testData,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-legacy-template';
const INDEX_PATTERNS = ['index-management-api-legacy-pattern*'];

// Legacy templates do not exist on serverless.
apiTest.describe('Legacy index templates API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;
  let serverless: boolean;

  const legacyPayload = (indexMode?: 'standard') =>
    getTemplatePayload({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      isLegacy: true,
      indexMode,
      serverless,
    });

  const createTemplate = (apiClient: ApiClientFixture, template: TemplateDeserialized) =>
    apiClient.post(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify(template),
    });

  const getTemplate = (apiClient: ApiClientFixture) =>
    apiClient.get(`${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}?legacy=true`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    serverless = config.serverless;
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteLegacyTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteLegacyTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest(
    'lists the legacy index templates with the expected parameters',
    async ({ apiClient }) => {
      expect(await createTemplate(apiClient, legacyPayload())).toHaveStatusCode(200);

      const response = await apiClient.get(`${API_BASE_PATH}/index_templates`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const template = (response.body.legacyTemplates as TemplateDeserialized[]).find(
        ({ name }) => name === TEMPLATE_NAME
      );
      expect(Object.keys(template ?? {}).sort()).toStrictEqual(
        [
          '_kbnMeta',
          'allowAutoCreate',
          'composedOf',
          'hasAliases',
          'hasMappings',
          'hasSettings',
          'ignoreMissingComponentTemplates',
          'indexPatterns',
          'name',
          'order',
          'version',
        ].sort()
      );
    }
  );

  apiTest('returns a legacy index template with the expected parameters', async ({ apiClient }) => {
    expect(await createTemplate(apiClient, legacyPayload())).toHaveStatusCode(200);

    const response = await getTemplate(apiClient);

    expect(response).toHaveStatusCode(200);
    expect(response.body.name).toBe(TEMPLATE_NAME);
    expect(Object.keys(response.body).sort()).toStrictEqual(
      [
        '_kbnMeta',
        'allowAutoCreate',
        'composedOf',
        'ignoreMissingComponentTemplates',
        'indexPatterns',
        'name',
        'order',
        'template',
        'version',
      ].sort()
    );
    expect(Object.keys(response.body.template).sort()).toStrictEqual([
      'aliases',
      'mappings',
      'settings',
    ]);
  });

  apiTest('returns a legacy index template carrying an index mode', async ({ apiClient }) => {
    expect(await createTemplate(apiClient, legacyPayload('standard'))).toHaveStatusCode(200);

    const response = await getTemplate(apiClient);

    expect(response).toHaveStatusCode(200);
    expect(response.body.indexMode).toBe('standard');
  });

  apiTest('creates a legacy index template', async ({ apiClient, esClient }) => {
    expect(await createTemplate(apiClient, legacyPayload())).toHaveStatusCode(200);
    expect(await templateExists(esClient, TEMPLATE_NAME)).toBe(true);
  });

  apiTest('updates a legacy index template', async ({ apiClient, esClient }) => {
    expect(await createTemplate(apiClient, legacyPayload())).toHaveStatusCode(200);
    expect(await getTemplateVersion(esClient, TEMPLATE_NAME)).toBe('1');

    const response = await apiClient.put(`${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ ...legacyPayload(), version: 2 }),
    });

    expect(response).toHaveStatusCode(200);
    expect(await getTemplateVersion(esClient, TEMPLATE_NAME)).toBe('2');
  });

  apiTest('deletes a legacy index template', async ({ apiClient, esClient }) => {
    expect(await createTemplate(apiClient, legacyPayload())).toHaveStatusCode(200);

    const response = await apiClient.post(`${API_BASE_PATH}/delete_index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ templates: [{ name: TEMPLATE_NAME, isLegacy: true }] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.errors).toStrictEqual([]);
    expect(response.body.templatesDeleted).toStrictEqual([TEMPLATE_NAME]);
    expect(await templateExists(esClient, TEMPLATE_NAME)).toBe(false);
  });
});
