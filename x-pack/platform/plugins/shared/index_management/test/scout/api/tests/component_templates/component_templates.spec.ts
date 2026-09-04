/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const NAME = 'index-management-api-component-template';
const OTHER_NAME = `${NAME}-other`;
const MISSING_NAME = 'index-management-api-component-template-missing';

const TEMPLATE_NAME = 'index-management-api-component-template-parent';
const INDEX_PATTERN = 'logs-index-management-api-component-*';
const DATA_STREAM_NAME = 'logs-index-management-api-component-default';

// Serverless rejects `index.number_of_shards` and does not offer the `_source` field section.
const componentFor = (serverless: boolean) => ({
  template: {
    settings: serverless ? {} : { index: { number_of_shards: 1 } },
    mappings: {
      ...(serverless ? {} : { _source: { enabled: false } }),
      properties: {
        host_name: { type: 'keyword' },
        created_at: { type: 'date', format: 'EEE MMM dd HH:mm:ss Z yyyy' },
      },
    },
  },
});

const cleanup = async (esClient: EsClient) => {
  await esClient.indices.deleteDataStream({ name: DATA_STREAM_NAME }, { ignore: [404] });
  await esClient.indices.deleteIndexTemplate({ name: TEMPLATE_NAME }, { ignore: [404] });
  for (const name of [NAME, OTHER_NAME]) {
    await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
  }
};

apiTest.describe('Component templates API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  let serverless: boolean;
  let component: ReturnType<typeof componentFor>;

  const create = (apiClient: ApiClientFixture, name: string, body?: object) =>
    apiClient.post(`${API_BASE_PATH}/component_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        name,
        ...(body ?? component),
        _kbnMeta: { usedBy: [], isManaged: false },
      }),
    });

  const update = (apiClient: ApiClientFixture, name: string, body: object) =>
    apiClient.put(`${API_BASE_PATH}/component_templates/${name}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        name,
        ...body,
        version: 1,
        _kbnMeta: { usedBy: [], isManaged: false },
      }),
    });

  const getOne = (apiClient: ApiClientFixture, name: string) =>
    apiClient.get(`${API_BASE_PATH}/component_templates/${name}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

  const remove = (apiClient: ApiClientFixture, names: string) =>
    apiClient.delete(`${API_BASE_PATH}/component_templates/${names}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    serverless = config.serverless;
    component = componentFor(serverless);
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanup(esClient);
  });

  apiTest('returns an array of component templates', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await apiClient.get(`${API_BASE_PATH}/component_templates`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const template = (response.body as Array<{ name: string }>).find(({ name }) => name === NAME);
    expect(template).toStrictEqual({
      name: NAME,
      usedBy: [],
      isManaged: false,
      hasSettings: !serverless,
      isDeprecated: false,
      hasMappings: true,
      hasAliases: false,
      hasFrozenOrDeletePhase: false,
    });
  });

  apiTest('returns a single component template', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await getOne(apiClient, NAME);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      name: NAME,
      ...component,
      template: {
        ...component.template,
        // Elasticsearch reports index settings as strings.
        settings: serverless ? {} : { index: { number_of_shards: '1' } },
      },
      _kbnMeta: { usedBy: [], isManaged: false },
    });
  });

  apiTest('creates a component template', async ({ apiClient }) => {
    const response = await create(apiClient, NAME, {
      version: 1,
      template: {
        settings: serverless ? {} : { number_of_shards: 1 },
        aliases: { alias1: {} },
        mappings: { properties: { host_name: { type: 'keyword' } } },
        lifecycle: { enabled: true, data_retention: '2d' },
      },
      _meta: {
        description: 'set number of shards to one',
        serialization: { class: 'MyComponentTemplate', id: 10 },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ acknowledged: true });
  });

  apiTest('creates a component template with a frozen_after lifecycle', async ({ apiClient }) => {
    const lifecycle = { enabled: true, data_retention: '90d', frozen_after: '30d' };
    expect(await create(apiClient, NAME, { template: { lifecycle } })).toHaveStatusCode(200);

    const response = await getOne(apiClient, NAME);

    expect(response).toHaveStatusCode(200);
    expect(response.body.template.lifecycle).toStrictEqual(lifecycle);
  });

  apiTest('creates a component template with only required fields', async ({ apiClient }) => {
    // Excludes version and _meta
    const response = await create(apiClient, NAME, { template: {} });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ acknowledged: true });
  });

  apiTest('rejects creating a component template that already exists', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await create(apiClient, NAME, { template: {} });

    expect(response).toHaveStatusCode(409);
    expect(response.body).toStrictEqual({
      statusCode: 409,
      error: 'Conflict',
      message: `There is already a component template with name '${NAME}'.`,
    });
  });

  apiTest('updates an existing component template', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await update(apiClient, NAME, component);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ acknowledged: true });
  });

  apiTest('rejects updating a component template that does not exist', async ({ apiClient }) => {
    const response = await update(apiClient, MISSING_NAME, component);

    expect(response).toHaveStatusCode(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      error: 'Not Found',
      message: `component template matching [${MISSING_NAME}] not found`,
      attributes: {
        error: {
          reason: `component template matching [${MISSING_NAME}] not found`,
          root_cause: [
            {
              reason: `component template matching [${MISSING_NAME}] not found`,
              type: 'resource_not_found_exception',
            },
          ],
          type: 'resource_not_found_exception',
        },
      },
    });
  });

  apiTest('updates a deprecated component template', async ({ apiClient }) => {
    const deprecated = { template: {}, deprecated: true };
    expect(await create(apiClient, NAME, deprecated)).toHaveStatusCode(200);

    const response = await update(apiClient, NAME, deprecated);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ acknowledged: true });
  });

  apiTest('deletes a component template', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await remove(apiClient, NAME);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ itemsDeleted: [NAME], errors: [] });
  });

  apiTest('deletes multiple component templates', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);
    expect(await create(apiClient, OTHER_NAME)).toHaveStatusCode(200);

    const response = await remove(apiClient, `${NAME},${OTHER_NAME}`);

    expect(response).toHaveStatusCode(200);
    expect(response.body.errors).toStrictEqual([]);
    // The order of itemsDeleted is not guaranteed.
    expect([...response.body.itemsDeleted].sort()).toStrictEqual([NAME, OTHER_NAME].sort());
  });

  apiTest('reports the component templates it could not delete', async ({ apiClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);

    const response = await remove(apiClient, `${NAME},${MISSING_NAME}`);

    expect(response).toHaveStatusCode(200);
    expect(response.body.itemsDeleted).toStrictEqual([NAME]);
    expect(response.body.errors[0].name).toBe(MISSING_NAME);
    expect(response.body.errors[0].error.payload.attributes.error).toStrictEqual({
      root_cause: [{ type: 'resource_not_found_exception', reason: MISSING_NAME }],
      type: 'resource_not_found_exception',
      reason: MISSING_NAME,
    });
  });

  apiTest(
    'returns no data streams for an unused component template',
    async ({ apiClient, esClient }) => {
      expect(await create(apiClient, NAME)).toHaveStatusCode(200);
      await esClient.indices.putIndexTemplate({
        name: TEMPLATE_NAME,
        index_patterns: [INDEX_PATTERN],
        composed_of: [NAME],
      });

      const response = await apiClient.get(
        `${API_BASE_PATH}/component_templates/${NAME}/datastreams`,
        { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ data_streams: [] });
    }
  );

  apiTest('returns the data streams of a component template', async ({ apiClient, esClient }) => {
    expect(await create(apiClient, NAME)).toHaveStatusCode(200);
    await esClient.indices.putIndexTemplate({
      name: TEMPLATE_NAME,
      index_patterns: [INDEX_PATTERN],
      composed_of: [NAME],
      data_stream: {},
    });
    await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });

    const response = await apiClient.get(
      `${API_BASE_PATH}/component_templates/${NAME}/datastreams`,
      { headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader }, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ data_streams: [DATA_STREAM_NAME] });
  });
});
