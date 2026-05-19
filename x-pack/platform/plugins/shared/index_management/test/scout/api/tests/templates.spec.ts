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
  createHeaders,
  getSerializedTemplate,
  getTemplatePayload,
  indexManagementApi,
  resetLogsdbClusterSettings,
  uniqueName,
} from '../fixtures';
import { IndexMode } from '../../../../common/constants';

apiTest.describe('Index Management index templates API', { tag: tags.stateful.classic }, () => {
  const templatesCreated: Array<{ name: string; isLegacy?: boolean }> = [];
  const dataStreamsCreated: string[] = [];

  apiTest.afterAll(async ({ apiClient, esClient, log, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    await indexManagementApi(apiClient, createHeaders(apiKeyHeader))
      .templates.delete(templatesCreated)
      .catch((error) =>
        log.debug(`[Cleanup error] Error deleting index templates: ${error.message}`)
      );

    for (const dataStream of dataStreamsCreated) {
      await esClient.indices
        .deleteDataStream({ name: dataStream })
        .catch((error) =>
          log.debug(`[Cleanup error] Error deleting data stream: ${error.message}`)
        );
    }
    await resetLogsdbClusterSettings(esClient);
  });

  apiTest(
    'lists index templates with expected summary properties',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

      const indexTemplate = getTemplatePayload(uniqueName('im-template'), [
        uniqueName('im-pattern'),
      ]);
      const legacyTemplate = getTemplatePayload(
        uniqueName('im-legacy-template'),
        [uniqueName('im-pattern')],
        true
      );
      const dslTemplateBase = getTemplatePayload(uniqueName('im-dsl-template'), [
        uniqueName('im-pattern'),
      ]);
      const indexTemplateWithDSL = {
        ...dslTemplateBase,
        dataStream: {},
        template: {
          ...dslTemplateBase.template,
          lifecycle: {
            enabled: true,
            data_retention: '10d',
          },
        },
      };
      const ilmTemplateBase = getTemplatePayload(uniqueName('im-ilm-template'), [
        uniqueName('im-pattern'),
      ]);
      const indexTemplateWithILM = {
        ...ilmTemplateBase,
        template: {
          ...ilmTemplateBase.template,
          settings: {
            ...ilmTemplateBase.template.settings,
            index: {
              lifecycle: {
                name: 'my_policy',
              },
            },
          },
        },
      };
      const indexModeTemplate = {
        ...getTemplatePayload(uniqueName('im-index-mode-template'), [uniqueName('im-pattern')]),
        indexMode: IndexMode.standard,
      };

      for (const template of [
        indexTemplate,
        legacyTemplate,
        indexTemplateWithDSL,
        indexTemplateWithILM,
        indexModeTemplate,
      ]) {
        const response = await api.templates.create(template);
        expect(response).toHaveStatusCode(200);
        templatesCreated.push({
          name: template.name,
          isLegacy: template._kbnMeta.isLegacy,
        });
      }

      const response = await api.templates.getAll();
      expect(response).toHaveStatusCode(200);

      const foundIndexTemplate = response.body.templates.find(
        ({ name }: { name: string }) => name === indexTemplate.name
      );
      expect(Object.keys(foundIndexTemplate).sort()).toStrictEqual(
        [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'priority',
          'composedOf',
          'ignoreMissingComponentTemplates',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
        ].sort()
      );

      const foundLegacyTemplate = response.body.legacyTemplates.find(
        ({ name }: { name: string }) => name === legacyTemplate.name
      );
      expect(Object.keys(foundLegacyTemplate).sort()).toStrictEqual(
        [
          'name',
          'indexPatterns',
          'hasSettings',
          'hasAliases',
          'hasMappings',
          'order',
          'version',
          '_kbnMeta',
          'allowAutoCreate',
          'composedOf',
          'ignoreMissingComponentTemplates',
        ].sort()
      );

      expect(
        Object.keys(
          response.body.templates.find(
            ({ name }: { name: string }) => name === indexTemplateWithDSL.name
          )
        ).sort()
      ).toContain('lifecycle');
      expect(
        Object.keys(
          response.body.templates.find(
            ({ name }: { name: string }) => name === indexTemplateWithILM.name
          )
        ).sort()
      ).toContain('ilmPolicy');
      expect(
        Object.keys(
          response.body.templates.find(
            ({ name }: { name: string }) => name === indexModeTemplate.name
          )
        ).sort()
      ).toContain('indexMode');
    }
  );

  apiTest('gets composable and legacy templates', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

    const template = getTemplatePayload(uniqueName('im-get-template'), [uniqueName('im-pattern')]);
    const legacyTemplate = getTemplatePayload(
      uniqueName('im-get-legacy-template'),
      [uniqueName('im-pattern')],
      true
    );

    for (const payload of [template, legacyTemplate]) {
      const response = await api.templates.create(payload);
      expect(response).toHaveStatusCode(200);
      templatesCreated.push({ name: payload.name, isLegacy: payload._kbnMeta.isLegacy });
    }

    const templateResponse = await api.templates.getOne(template.name);
    expect(templateResponse).toHaveStatusCode(200);
    expect(templateResponse.body.name).toBe(template.name);
    expect(Object.keys(templateResponse.body.template).sort()).toStrictEqual(
      ['aliases', 'mappings', 'settings'].sort()
    );

    const legacyTemplateResponse = await api.templates.getOne(legacyTemplate.name, true);
    expect(legacyTemplateResponse).toHaveStatusCode(200);
    expect(legacyTemplateResponse.body.name).toBe(legacyTemplate.name);
    expect(legacyTemplateResponse.body.order).toBe(1);
  });

  apiTest(
    'creates templates and validates conflicts and payloads',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));
      const template = getTemplatePayload(uniqueName('im-create-template'), [
        uniqueName('im-pattern'),
      ]);
      const legacyTemplate = getTemplatePayload(
        uniqueName('im-create-legacy-template'),
        [uniqueName('im-pattern')],
        true
      );

      expect(await api.templates.create(template)).toHaveStatusCode(200);
      expect(await api.templates.create(legacyTemplate)).toHaveStatusCode(200);
      templatesCreated.push(
        { name: template.name, isLegacy: false },
        { name: legacyTemplate.name, isLegacy: true }
      );

      expect(await api.templates.create(template)).toHaveStatusCode(409);

      const invalidPayload = { ...getTemplatePayload(uniqueName('im-invalid-template')) };
      delete (invalidPayload as { indexPatterns?: string[] }).indexPatterns;
      const invalidResponse = await api.templates.create(invalidPayload);
      expect(invalidResponse).toHaveStatusCode(400);
      expect(invalidResponse.body.message).toContain(
        '[request body.indexPatterns]: expected value of type [array]'
      );
    }
  );

  apiTest(
    'surfaces Elasticsearch causes for create and update errors',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

      const createTemplate = getTemplatePayload(uniqueName('im-create-es-error'), [
        uniqueName('im-pattern'),
      ]);
      createTemplate.template.mappings = {
        ...createTemplate.template.mappings,
        runtime: {
          myRuntimeField: {
            type: 'boolean',
            script: {
              source: 'emit("hello with error',
            },
          },
        },
      };

      const createResponse = await api.templates.create(createTemplate);
      expect(createResponse).toHaveStatusCode(400);
      expect(createResponse.body.attributes.error.reason).toContain(
        'template after composition is invalid'
      );
      expect(createResponse.body.attributes.causes.join(',')).toContain('"hello with error');

      const updateTemplate = getTemplatePayload(uniqueName('im-update-es-error'), [
        uniqueName('im-pattern'),
      ]);
      updateTemplate.template.mappings = {
        ...updateTemplate.template.mappings,
        runtime: {
          myRuntimeField: {
            type: 'keyword',
            script: {
              source: 'emit("hello")',
            },
          },
        },
      };
      expect(await api.templates.create(updateTemplate)).toHaveStatusCode(200);
      templatesCreated.push({ name: updateTemplate.name });

      updateTemplate.template.mappings.runtime.myRuntimeField.script = 'emit("hello with error';
      const updateResponse = await api.templates.update(updateTemplate.name, updateTemplate);
      expect(updateResponse).toHaveStatusCode(400);
      expect(updateResponse.body.attributes.causes.join(',')).toContain('"hello with error');
    }
  );

  apiTest('updates and deletes templates', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));
    const template = getTemplatePayload(uniqueName('im-update-template'), [
      uniqueName('im-pattern'),
    ]);
    const legacyTemplate = getTemplatePayload(
      uniqueName('im-update-legacy-template'),
      [uniqueName('im-pattern')],
      true
    );

    for (const payload of [template, legacyTemplate]) {
      expect(await api.templates.create(payload)).toHaveStatusCode(200);
      templatesCreated.push({ name: payload.name, isLegacy: payload._kbnMeta.isLegacy });
      expect(await api.templates.update(payload.name, { ...payload, version: 2 })).toHaveStatusCode(
        200
      );

      const catResponse = await esClient.cat.templates({ name: payload.name, format: 'json' });
      expect(catResponse.find(({ name }) => name === payload.name)?.version).toBe('2');

      const deleteResponse = await api.templates.delete([
        { name: payload.name, isLegacy: payload._kbnMeta.isLegacy },
      ]);
      expect(deleteResponse).toHaveStatusCode(200);
      expect(deleteResponse.body.errors).toStrictEqual([]);
      expect(deleteResponse.body.templatesDeleted).toContain(payload.name);
    }
  });

  apiTest('simulates templates', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

    const simulateResponse = await api.templates.simulate(
      getSerializedTemplate([uniqueName('im-pattern')])
    );
    expect(simulateResponse).toHaveStatusCode(200);
    expect(simulateResponse.body.template).toBeDefined();

    const dataStreamName = uniqueName('test-foo');
    const template = getTemplatePayload(uniqueName('im-simulate-template'), [`${dataStreamName}*`]);
    expect(await api.templates.create({ ...template, dataStream: {} })).toHaveStatusCode(200);
    templatesCreated.push({ name: template.name });

    dataStreamsCreated.push(dataStreamName);
    await esClient.indices.createDataStream({ name: dataStreamName });

    expect(await api.templates.simulateByName(template.name)).toHaveStatusCode(200);
  });

  apiTest(
    'returns logsdb index mode for logs index patterns according to cluster settings',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));
      const template = getTemplatePayload(uniqueName('im-logsdb-template'), ['logs-*-*']);

      expect(await api.templates.create(template)).toHaveStatusCode(200);
      templatesCreated.push({ name: template.name });

      const logsdbSettings: Array<{
        enabled: boolean | null;
        priorLogsUsage: boolean;
        indexMode?: string;
      }> = [
        { enabled: true, priorLogsUsage: true, indexMode: 'logsdb' },
        { enabled: false, priorLogsUsage: true, indexMode: undefined },
        { enabled: null, priorLogsUsage: true, indexMode: undefined },
        { enabled: null, priorLogsUsage: false, indexMode: 'logsdb' },
      ];

      for (const { enabled, priorLogsUsage, indexMode } of logsdbSettings) {
        await esClient.cluster.putSettings({
          persistent: {
            cluster: { logsdb: { enabled } },
            logsdb: { prior_logs_usage: priorLogsUsage },
          },
        });

        const response = await api.templates.getOne(template.name);
        expect(response).toHaveStatusCode(200);
        expect(response.body.indexMode).toBe(indexMode);
      }
    }
  );
});
