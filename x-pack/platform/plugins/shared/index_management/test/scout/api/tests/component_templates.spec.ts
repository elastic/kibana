/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, createHeaders, indexManagementApi, uniqueName } from '../fixtures';

const component = {
  template: {
    settings: {
      index: {
        number_of_shards: 1,
      },
    },
    mappings: {
      _source: {
        enabled: false,
      },
      properties: {
        host_name: {
          type: 'keyword',
        },
        created_at: {
          type: 'date',
          format: 'EEE MMM dd HH:mm:ss Z yyyy',
        },
      },
    },
  },
} as const;

apiTest.describe('Index Management component templates API', { tag: tags.stateful.classic }, () => {
  const componentTemplates: string[] = [];
  const indexTemplates: string[] = [];
  const dataStreams: string[] = [];

  apiTest.afterAll(async ({ esClient, log }) => {
    for (const dataStream of dataStreams) {
      await esClient.indices
        .deleteDataStream({ name: dataStream })
        .catch((error) =>
          log.debug(`[Cleanup error] Error deleting data stream: ${error.message}`)
        );
    }
    for (const indexTemplate of indexTemplates) {
      await esClient.indices
        .deleteIndexTemplate({ name: indexTemplate })
        .catch((error) =>
          log.debug(`[Cleanup error] Error deleting index template: ${error.message}`)
        );
    }
    for (const componentTemplate of componentTemplates) {
      await esClient.cluster
        .deleteComponentTemplate({ name: componentTemplate })
        .catch((error) =>
          log.debug(`[Cleanup error] Error deleting component template: ${error.message}`)
        );
    }
  });

  apiTest('gets all and one component template', async ({ apiClient, esClient, requestAuth }) => {
    const name = uniqueName('im-get-component');
    componentTemplates.push(name);
    await esClient.cluster.putComponentTemplate({ name, ...component });

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).componentTemplates;

    const allResponse = await api.getAll();
    expect(allResponse).toHaveStatusCode(200);
    expect(
      allResponse.body.find(({ name: componentName }: { name: string }) => componentName === name)
    ).toStrictEqual({
      name,
      usedBy: [],
      isManaged: false,
      hasSettings: true,
      isDeprecated: false,
      hasMappings: true,
      hasAliases: false,
    });

    const oneResponse = await api.getOne(name);
    expect(oneResponse).toHaveStatusCode(200);
    expect(oneResponse.body).toStrictEqual({
      name,
      ...component,
      template: {
        ...component.template,
        settings: {
          index: {
            number_of_shards: '1',
          },
        },
      },
      _kbnMeta: {
        usedBy: [],
        isManaged: false,
      },
    });
  });

  apiTest(
    'creates component templates and rejects duplicates',
    async ({ apiClient, requestAuth }) => {
      const name = uniqueName('im-create-component');
      const requiredFieldsName = uniqueName('im-create-required-component');
      componentTemplates.push(name, requiredFieldsName);
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).componentTemplates;

      const createResponse = await api.create(name, {
        version: 1,
        template: {
          settings: {
            number_of_shards: 1,
          },
          aliases: {
            alias1: {},
          },
          mappings: {
            properties: {
              host_name: {
                type: 'keyword',
              },
            },
          },
          lifecycle: {
            enabled: true,
            data_retention: '2d',
          },
        },
        _meta: {
          description: 'set number of shards to one',
        },
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body).toStrictEqual({ acknowledged: true });

      const requiredFieldsResponse = await api.create(requiredFieldsName, {
        template: {},
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(requiredFieldsResponse).toHaveStatusCode(200);
      expect(requiredFieldsResponse.body).toStrictEqual({ acknowledged: true });

      const duplicateResponse = await api.create(name, {
        template: {},
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(duplicateResponse).toHaveStatusCode(409);
      expect(duplicateResponse.body.message).toBe(
        `There is already a component template with name '${name}'.`
      );
    }
  );

  apiTest(
    'updates component templates and handles missing templates',
    async ({ apiClient, esClient, requestAuth }) => {
      const name = uniqueName('im-update-component');
      const deprecatedName = uniqueName('im-deprecated-component');
      componentTemplates.push(name, deprecatedName);
      await esClient.cluster.putComponentTemplate({ name, ...component });
      await esClient.cluster.putComponentTemplate({
        name: deprecatedName,
        template: {},
        deprecated: true,
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).componentTemplates;

      const updateResponse = await api.update(name, {
        ...component,
        version: 1,
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toStrictEqual({ acknowledged: true });

      const missingResponse = await api.update(uniqueName('missing-component'), {
        ...component,
        version: 1,
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(missingResponse).toHaveStatusCode(404);
      expect(missingResponse.body.error).toBe('Not Found');

      const deprecatedResponse = await api.update(deprecatedName, {
        template: {},
        deprecated: true,
        version: 1,
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      });
      expect(deprecatedResponse).toHaveStatusCode(200);
      expect(deprecatedResponse.body).toStrictEqual({ acknowledged: true });
    }
  );

  apiTest('deletes component templates', async ({ apiClient, esClient, requestAuth }) => {
    const names = [
      uniqueName('im-delete-component-a'),
      uniqueName('im-delete-component-b'),
      uniqueName('im-delete-component-c'),
      uniqueName('im-delete-component-d'),
    ];

    await Promise.all(
      names.map((name) => esClient.cluster.putComponentTemplate({ name, ...component }))
    );

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).componentTemplates;

    const deleteSingleResponse = await api.delete(names[0]);
    expect(deleteSingleResponse).toHaveStatusCode(200);
    expect(deleteSingleResponse.body).toStrictEqual({ itemsDeleted: [names[0]], errors: [] });

    const deleteMultipleResponse = await api.delete(`${names[1]},${names[2]}`);
    expect(deleteMultipleResponse).toHaveStatusCode(200);
    expect(deleteMultipleResponse.body.errors).toStrictEqual([]);
    expect(deleteMultipleResponse.body.itemsDeleted).toStrictEqual(
      expect.arrayContaining([names[1], names[2]])
    );

    const missingName = uniqueName('missing-component');
    const deleteWithErrorResponse = await api.delete(`${names[3]},${missingName}`);
    expect(deleteWithErrorResponse).toHaveStatusCode(200);
    expect(deleteWithErrorResponse.body.itemsDeleted).toStrictEqual([names[3]]);
    expect(deleteWithErrorResponse.body.errors[0].name).toBe(missingName);
  });

  apiTest(
    'returns data streams that use a component template',
    async ({ apiClient, esClient, requestAuth }) => {
      const componentName = uniqueName('im-ds-component');
      const indexTemplateName = uniqueName('im-ds-index-template');
      const dataStreamName = uniqueName('logs-im-component-default');
      const indexPattern = `${dataStreamName}*`;
      componentTemplates.push(componentName);
      indexTemplates.push(indexTemplateName);
      dataStreams.push(dataStreamName);

      await esClient.cluster.putComponentTemplate({ name: componentName, ...component });
      await esClient.indices.putIndexTemplate({
        name: indexTemplateName,
        index_patterns: [indexPattern],
        composed_of: [componentName],
        data_stream: {},
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader)).componentTemplates;

      const emptyResponse = await api.getDatastreams(componentName);
      expect(emptyResponse).toHaveStatusCode(200);
      expect(emptyResponse.body).toStrictEqual({ data_streams: [] });

      await esClient.indices.createDataStream({ name: dataStreamName });

      const response = await api.getDatastreams(componentName);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ data_streams: [dataStreamName] });
    }
  );
});
