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
  deleteTemplate,
  getSerializedTemplate,
  getTemplatePayload,
  getTemplateVersion,
  templateExists,
  testData,
} from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const TEMPLATE_NAME = 'index-management-api-template';
const INDEX_PATTERNS = ['index-management-api-template-pattern*'];
const DATA_STREAM_NAME = 'index-management-api-template-pattern-ds';

apiTest.describe('Index templates API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  let serverless: boolean;

  const createTemplate = (apiClient: ApiClientFixture, template: TemplateDeserialized) =>
    apiClient.post(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify(template),
    });

  const getTemplate = (apiClient: ApiClientFixture, name: string) =>
    apiClient.get(`${API_BASE_PATH}/index_templates/${name}?legacy=false`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    serverless = config.serverless;
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteTemplate(esClient, TEMPLATE_NAME);
  });

  apiTest('lists the index templates with the expected parameters', async ({ apiClient }) => {
    await createTemplate(
      apiClient,
      getTemplatePayload({ name: TEMPLATE_NAME, indexPatterns: INDEX_PATTERNS, serverless })
    );

    const response = await apiClient.get(`${API_BASE_PATH}/index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const template = (response.body.templates as TemplateDeserialized[]).find(
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
        'priority',
        'version',
      ].sort()
    );
  });

  apiTest('returns an index template with the expected parameters', async ({ apiClient }) => {
    await createTemplate(
      apiClient,
      getTemplatePayload({ name: TEMPLATE_NAME, indexPatterns: INDEX_PATTERNS, serverless })
    );

    const response = await getTemplate(apiClient, TEMPLATE_NAME);

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
        'priority',
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

  apiTest('creates an index template', async ({ apiClient, esClient }) => {
    const response = await createTemplate(
      apiClient,
      getTemplatePayload({ name: TEMPLATE_NAME, indexPatterns: INDEX_PATTERNS, serverless })
    );

    expect(response).toHaveStatusCode(200);
    expect(await templateExists(esClient, TEMPLATE_NAME)).toBe(true);
  });

  apiTest('rejects creating two templates with the same name', async ({ apiClient }) => {
    const payload = getTemplatePayload({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      serverless,
    });
    expect(await createTemplate(apiClient, payload)).toHaveStatusCode(200);

    expect(await createTemplate(apiClient, payload)).toHaveStatusCode(409);
  });

  apiTest('validates the request payload', async ({ apiClient }) => {
    const { indexPatterns, ...payload } = getTemplatePayload({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      serverless,
    });

    const response = await createTemplate(apiClient, payload as TemplateDeserialized);

    expect(response).toHaveStatusCode(400);
    expect(response.body.message).toContain(
      '[request body.indexPatterns]: expected value of type [array] '
    );
  });

  apiTest(
    'parses the Elasticsearch error of a create and returns its cause',
    async ({ apiClient }) => {
      const payload = getTemplatePayload({
        name: TEMPLATE_NAME,
        indexPatterns: INDEX_PATTERNS,
        serverless,
      });
      payload.template!.mappings = {
        ...payload.template!.mappings,
        // Unterminated string: fails only once Elasticsearch composes the template.
        runtime: {
          myRuntimeField: { type: 'boolean', script: { source: 'emit("hello with error' } },
        },
      };

      const response = await createTemplate(apiClient, payload);

      expect(response).toHaveStatusCode(400);
      expect(response.body.attributes.error.reason).toContain(
        'template after composition is invalid'
      );
      expect(response.body.attributes.causes.join(',')).toContain('"hello with error');
    }
  );

  apiTest('updates an index template', async ({ apiClient, esClient }) => {
    const payload = getTemplatePayload({
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      serverless,
    });
    expect(await createTemplate(apiClient, payload)).toHaveStatusCode(200);
    expect(await getTemplateVersion(esClient, TEMPLATE_NAME)).toBe('1');

    const response = await apiClient.put(`${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ ...payload, version: 2 }),
    });

    expect(response).toHaveStatusCode(200);
    expect(await getTemplateVersion(esClient, TEMPLATE_NAME)).toBe('2');
  });

  apiTest(
    'parses the Elasticsearch error of an update and returns its cause',
    async ({ apiClient }) => {
      const payload = getTemplatePayload({
        name: TEMPLATE_NAME,
        indexPatterns: INDEX_PATTERNS,
        serverless,
      });
      payload.template!.mappings = {
        ...payload.template!.mappings,
        runtime: { myRuntimeField: { type: 'keyword', script: { source: 'emit("hello")' } } },
      };
      expect(await createTemplate(apiClient, payload)).toHaveStatusCode(200);

      payload.template!.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
      const response = await apiClient.put(`${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify(payload),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.attributes.causes.join(',')).toContain('"hello with error');
    }
  );

  apiTest('deletes an index template', async ({ apiClient, esClient }) => {
    expect(
      await createTemplate(
        apiClient,
        getTemplatePayload({ name: TEMPLATE_NAME, indexPatterns: INDEX_PATTERNS, serverless })
      )
    ).toHaveStatusCode(200);
    expect(await templateExists(esClient, TEMPLATE_NAME)).toBe(true);

    const response = await apiClient.post(`${API_BASE_PATH}/delete_index_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ templates: [{ name: TEMPLATE_NAME }] }),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.errors).toStrictEqual([]);
    expect(response.body.templatesDeleted).toStrictEqual([TEMPLATE_NAME]);
    expect(await templateExists(esClient, TEMPLATE_NAME)).toBe(false);
  });

  apiTest('simulates an index template', async ({ apiClient }) => {
    const response = await apiClient.post(`${API_BASE_PATH}/index_templates/simulate`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify(getSerializedTemplate(INDEX_PATTERNS, serverless)),
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.template).toBeDefined();
  });

  apiTest('simulates an index template by name', async ({ apiClient }) => {
    expect(
      await createTemplate(
        apiClient,
        getTemplatePayload({ name: TEMPLATE_NAME, indexPatterns: INDEX_PATTERNS, serverless })
      )
    ).toHaveStatusCode(200);

    const response = await apiClient.post(
      `${API_BASE_PATH}/index_templates/simulate/${TEMPLATE_NAME}`,
      { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
  });

  apiTest(
    'simulates an index template by name with a related data stream',
    async ({ apiClient, esClient }) => {
      const payload = getTemplatePayload({
        name: TEMPLATE_NAME,
        indexPatterns: INDEX_PATTERNS,
        serverless,
      });
      expect(await createTemplate(apiClient, { ...payload, dataStream: {} })).toHaveStatusCode(200);
      await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });

      const response = await apiClient.post(
        `${API_BASE_PATH}/index_templates/simulate/${TEMPLATE_NAME}`,
        { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      await esClient.indices.deleteDataStream({ name: DATA_STREAM_NAME }, { ignore: [404] });
    }
  );

  apiTest(
    'round-trips a data stream template with a frozen_after lifecycle',
    async ({ apiClient }) => {
      const payload = getTemplatePayload({
        name: TEMPLATE_NAME,
        indexPatterns: INDEX_PATTERNS,
        serverless,
      });
      const lifecycle = { enabled: true, data_retention: '90d', frozen_after: '30d' };
      expect(
        await createTemplate(apiClient, {
          ...payload,
          dataStream: {},
          template: { ...payload.template, lifecycle },
          _kbnMeta: { ...payload._kbnMeta, hasDatastream: true },
        })
      ).toHaveStatusCode(200);

      const response = await getTemplate(apiClient, TEMPLATE_NAME);

      expect(response).toHaveStatusCode(200);
      expect(response.body.template.lifecycle).toStrictEqual(lifecycle);
    }
  );

  apiTest('updates a deprecated index template', async ({ apiClient }) => {
    const payload: TemplateDeserialized = {
      _kbnMeta: { hasDatastream: false, type: 'default' },
      name: TEMPLATE_NAME,
      indexPatterns: INDEX_PATTERNS,
      indexMode: 'standard',
      template: {},
      deprecated: true,
      allowAutoCreate: 'TRUE',
    };
    expect(await createTemplate(apiClient, payload)).toHaveStatusCode(200);

    const response = await apiClient.put(`${API_BASE_PATH}/index_templates/${TEMPLATE_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify(payload),
    });

    expect(response).toHaveStatusCode(200);
  });
});
