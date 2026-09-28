/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import type { MappingsDefinition } from '@kbn/es-mappings';
import type { ResourceDefinition } from '../../../../resources/datastreams/types';
import { DatastreamInitializer } from '../datastream_initializer';

// Distinct name to avoid colliding with any running prod/dev data stream.
const TEST_DATA_STREAM = '.rule-events-rollover-integration-test';

// Simplified v6 mappings: episode.* are real fields.
const v6Mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    episode: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        status: { type: 'keyword' },
        status_count: { type: 'long' },
      },
    },
    space_id: { type: 'keyword' },
  },
};

// v7 mappings: alert.* are the real fields; episode.* forward to alert.* via aliases.
const v7Mappings: MappingsDefinition = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    alert: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        status: { type: 'keyword' },
        status_count: { type: 'long' },
      },
    },
    episode: {
      type: 'object',
      properties: {
        id: { type: 'alias', path: 'alert.id' },
        status: { type: 'alias', path: 'alert.status' },
        status_count: { type: 'alias', path: 'alert.status_count' },
      },
    },
    space_id: { type: 'keyword' },
  },
};

const createDefinition = (version: number, mappings: MappingsDefinition): ResourceDefinition => ({
  key: `data_stream:${TEST_DATA_STREAM}`,
  dataStreamName: TEST_DATA_STREAM,
  version,
  mappings,
  lifecycle: {},
});

describe('DatastreamInitializer — episode→alert rename (integration)', () => {
  let esServer: EsTestCluster;
  let logger: Logger;

  const cleanup = async () => {
    const esClient = esServer.getClient();
    await esClient.indices.deleteDataStream({ name: TEST_DATA_STREAM }).catch(() => {});
    await esClient.indices.deleteIndexTemplate({ name: TEST_DATA_STREAM }).catch(() => {});
  };

  beforeAll(async () => {
    jest.setTimeout(90_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  afterEach(async () => {
    await cleanup();
  });

  const initialize = (version: number, mappings: MappingsDefinition) =>
    new DatastreamInitializer(
      logger,
      esServer.getClient(),
      createDefinition(version, mappings)
    ).initialize();

  const getDataStream = async () => {
    const {
      data_streams: [dataStream],
    } = await esServer.getClient().indices.getDataStream({ name: TEST_DATA_STREAM });
    return dataStream;
  };

  const getIndexMappings = async (index: string) => {
    const {
      [index]: { mappings },
    } = await esServer.getClient().indices.getMapping({ index });
    return mappings;
  };

  const writeAlertEvent = (id: string, alert: Record<string, unknown>) =>
    esServer.getClient().create({
      index: TEST_DATA_STREAM,
      id,
      document: { '@timestamp': new Date().toISOString(), space_id: 'default', ...alert },
      refresh: true,
    });

  // Recreates the state left by the v6 plugin: an index template without a mappings version
  // and a data stream holding a document written with the episode.* field names.
  const seedV6DataStream = async () => {
    const esClient = esServer.getClient();

    await esClient.indices.putIndexTemplate({
      name: TEST_DATA_STREAM,
      index_patterns: [`${TEST_DATA_STREAM}*`],
      data_stream: { hidden: true },
      priority: 100,
      _meta: { version: 6, managed: true, previousVersions: [] },
      template: { mappings: v6Mappings },
    });
    await esClient.indices.createDataStream({ name: TEST_DATA_STREAM });
    await writeAlertEvent('legacy-doc', {
      episode: { id: 'legacy-episode', status: 'active', status_count: 3 },
    });
  };

  it('keeps existing backing indices and rolls over on the next write when upgrading from v6', async () => {
    const esClient = esServer.getClient();
    await seedV6DataStream();
    const {
      indices: [{ index_name: legacyBackingIndex }],
    } = await getDataStream();

    await initialize(7, v7Mappings);

    const {
      index_templates: [indexTemplate],
    } = await esClient.indices.getIndexTemplate({ name: TEST_DATA_STREAM });
    expect(indexTemplate.index_template._meta?.version).toBe(7);
    expect(indexTemplate.index_template.template?.mappings?._meta).toEqual({ version: 7 });

    // No mapping update and no data loss: the legacy backing index is untouched.
    const upgradedDataStream = await getDataStream();
    expect(upgradedDataStream.generation).toBe(1);
    expect(upgradedDataStream.rollover_on_write).toBe(true);
    expect((await esClient.count({ index: TEST_DATA_STREAM })).count).toBe(1);
    const legacyMappings = await getIndexMappings(legacyBackingIndex);
    expect(legacyMappings.properties).toMatchObject({
      episode: { properties: { id: { type: 'keyword' } } },
    });
    expect(legacyMappings.properties).not.toHaveProperty('alert');

    await writeAlertEvent('new-doc', { alert: { id: 'new-alert', status: 'active' } });

    const rolledOverDataStream = await getDataStream();
    expect(rolledOverDataStream.generation).toBe(2);
    expect(rolledOverDataStream.rollover_on_write).toBe(false);
    const writeIndexMappings = await getIndexMappings(
      rolledOverDataStream.indices[rolledOverDataStream.indices.length - 1].index_name
    );
    expect(writeIndexMappings._meta).toEqual({ version: 7 });
    expect(writeIndexMappings.properties).toMatchObject({
      alert: { properties: { id: { type: 'keyword' } } },
      episode: { properties: { id: { type: 'alias', path: 'alert.id' } } },
    });

    // Restarting does not schedule another rollover.
    await initialize(7, v7Mappings);
    const restartedDataStream = await getDataStream();
    expect(restartedDataStream.generation).toBe(2);
    expect(restartedDataStream.rollover_on_write).toBe(false);
  });

  it('resolves episode.* in ES|QL across backing indices created before and after the upgrade', async () => {
    const esClient = esServer.getClient();
    await seedV6DataStream();
    await initialize(7, v7Mappings);
    await writeAlertEvent('new-doc', { alert: { id: 'new-alert', status: 'active' } });

    const { values } = await esClient.esql.query({
      query: `FROM ${TEST_DATA_STREAM} | WHERE episode.status == "active" | KEEP episode.id | SORT episode.id`,
    });
    expect(values).toEqual([['legacy-episode'], ['new-alert']]);

    const { values: stats } = await esClient.esql.query({
      query: `FROM ${TEST_DATA_STREAM} | STATS count = COUNT(*) BY episode.id | SORT episode.id`,
    });
    expect(stats).toEqual([
      [1, 'legacy-episode'],
      [1, 'new-alert'],
    ]);
  });

  it('rejects documents written with episode.* once the data stream has rolled over', async () => {
    await seedV6DataStream();
    await initialize(7, v7Mappings);
    await writeAlertEvent('new-doc', { alert: { id: 'new-alert', status: 'active' } });

    // Accepted during a rolling upgrade: nodes still running v6 fail to write episode.* fields.
    await expect(
      writeAlertEvent('old-node-doc', { episode: { id: 'old-node-episode', status: 'active' } })
    ).rejects.toThrow(/field alias/);
  });

  it('does not roll over an existing data stream when the version is unchanged', async () => {
    await seedV6DataStream();

    await initialize(6, v6Mappings);

    const dataStream = await getDataStream();
    expect(dataStream.generation).toBe(1);
    expect(dataStream.rollover_on_write).toBe(false);
  });

  it('creates the data stream with the v7 mappings on a fresh install', async () => {
    await initialize(7, v7Mappings);

    const dataStream = await getDataStream();
    expect(dataStream.generation).toBe(1);
    expect(dataStream.rollover_on_write).toBe(false);
    const writeIndexMappings = await getIndexMappings(dataStream.indices[0].index_name);
    expect(writeIndexMappings._meta).toEqual({ version: 7 });
    expect(writeIndexMappings.properties).toMatchObject({
      episode: { properties: { id: { type: 'alias', path: 'alert.id' } } },
    });
  });
});
