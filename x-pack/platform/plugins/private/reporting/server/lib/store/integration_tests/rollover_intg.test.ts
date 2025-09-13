/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD,
} from '@kbn/reporting-server';

describe('reporting data stream roll over', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let settings: Record<string, unknown>;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    ({ esServer, kibanaServer, settings } = setupResult);

    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  // restart Kibana, updating `kibanaServer` and `esClient`
  async function restartKibana() {
    await kibanaServer.stop();

    const root = createRootWithCorePlugins(settings, { oss: false });

    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    kibanaServer = {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    };
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  }

  it('rolls over the data stream as appropriate', async () => {
    // ensure the data stream does not exist
    const exists = await esClient.indices.exists({
      index: REPORTING_DATA_STREAM_ALIAS,
    });
    expect(exists).toBe(false);

    // create it, and get the mappings
    await esClient.indices.createDataStream({ name: REPORTING_DATA_STREAM_ALIAS });
    const mappingVersion = await getMappingVersion(esClient);
    expect(mappingVersion).toBeDefined();

    // get the template version
    const templateVersion = await getMaxTemplateVersion(esClient);

    // ensure the mapping version matches the template version
    expect(mappingVersion).toBe(templateVersion);

    // -----------------------------------------------------------------
    // Now we're going to update the template version, and restart Kibana
    // -----------------------------------------------------------------
    const updateTemplateResult = await esClient.indices.putIndexTemplate({
      name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
      index_patterns: [REPORTING_DATA_STREAM_ALIAS],
      version: templateVersion + 1,
      data_stream: {},
    });
    expect(updateTemplateResult.acknowledged).toBe(true);

    // get the template version
    const newTemplateVersion = await getMaxTemplateVersion(esClient);
    expect(newTemplateVersion).toBe(templateVersion + 1);

    await restartKibana();

    const exists2ndTime = await esClient.indices.exists({
      index: REPORTING_DATA_STREAM_ALIAS,
    });
    expect(exists2ndTime).toBe(true);

    const newMappingVersion = await getMappingVersion(esClient);
    expect(newMappingVersion).toBeDefined();
    // the mapping version should have been updated to match the new template version
    expect(newMappingVersion).toBe(newTemplateVersion);

    const oldDS = await esClient.indices.getDataStream({ name: REPORTING_DATA_STREAM_ALIAS });
    expect(oldDS.data_streams.length).toBe(2);

    // -----------------------------------------------------------------
    // restart Kibana again, make sure we don't roll over again
    // -----------------------------------------------------------------
    await restartKibana();

    const newDS = await esClient.indices.getDataStream({ name: REPORTING_DATA_STREAM_ALIAS });
    expect(newDS.data_streams.length).toBe(2);
  });
});

async function getMappingVersion(esClient: ElasticsearchClient) {
  const mappingsRecord = await esClient.indices.getMapping({
    index: REPORTING_DATA_STREAM_ALIAS,
  });
  const mappingsArray = Object.values(mappingsRecord);
  expect(mappingsArray.length).toBe(1);

  // ensure the _meta field is set on the mappings
  const [mappings] = mappingsArray;
  const mappingVersion = mappings.mappings._meta?.[REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD];
  return mappingVersion;
}

async function getMaxTemplateVersion(esClient: ElasticsearchClient) {
  const gotTemplate = await esClient.indices.getIndexTemplate({
    name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  });
  expect(gotTemplate.index_templates.length).toBeGreaterThan(0);

  const templateVersions: number[] = [];
  for (const template of gotTemplate.index_templates) {
    const templateVersion = template.index_template.version;
    if (templateVersion) templateVersions.push(templateVersion);
  }
  expect(templateVersions.length).toBeGreaterThan(0);

  // assume the highest version is the one in use
  const templateVersion = Math.max(...templateVersions);
  return templateVersion;
}

async function setupTestServers(settings = {}) {
  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: {
      es: {
        license: 'trial',
      },
    },
  });

  const esServer = await startES();

  const root = createRootWithCorePlugins(settings, { oss: false });

  await root.preboot();
  const coreSetup = await root.setup();
  const coreStart = await root.start();

  return {
    esServer,
    kibanaServer: {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    },
    settings,
  };
}
