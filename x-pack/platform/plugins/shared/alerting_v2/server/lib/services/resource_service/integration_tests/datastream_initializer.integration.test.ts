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
const TEST_DATA_STREAM = '.rule-events-migration-integration-test';

// Simplified v6 mappings: episode.* are real keyword/long fields, no alias.
// These match the shape that existed before the episode→alert rename.
const v6MappingsRaw = {
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
      properties: {
        id: { type: 'alias', path: 'alert.id' },
        status: { type: 'alias', path: 'alert.status' },
        status_count: { type: 'alias', path: 'alert.status_count' },
      },
    },
    space_id: { type: 'keyword' },
  },
};

const v7Definition: ResourceDefinition = {
  key: `data_stream:${TEST_DATA_STREAM}`,
  dataStreamName: TEST_DATA_STREAM,
  version: 7,
  mappings: v7Mappings,
  lifecycle: {},
  episodeToAlertMigration: true,
};

describe('DatastreamInitializer — episode→alert migration (integration)', () => {
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

  // Installs a v6-shaped template and data stream with real episode.* fields,
  // then writes one document using the old field names.
  const seedLegacyDataStream = async () => {
    const esClient = esServer.getClient();

    await esClient.indices.putIndexTemplate({
      name: TEST_DATA_STREAM,
      index_patterns: [`${TEST_DATA_STREAM}*`],
      data_stream: {},
      priority: 100,
      _meta: { version: 6, managed: true, previousVersions: [] },
      template: {
        mappings: v6MappingsRaw,
        settings: { 'index.auto_expand_replicas': '0-1' },
      },
    });

    await esClient.indices.createDataStream({ name: TEST_DATA_STREAM });

    await esClient.create({
      index: TEST_DATA_STREAM,
      id: 'legacy-doc-1',
      document: {
        '@timestamp': new Date().toISOString(),
        episode: { id: 'ep-abc', status: 'active', status_count: 3 },
        space_id: 'default',
      },
      refresh: true,
    });
  };

  it('detects a v6 data stream and wipes it, then recreates with v7 alias mappings', async () => {
    const esClient = esServer.getClient();
    await seedLegacyDataStream();

    // Sanity: v6 doc is there
    const before = await esClient.count({ index: TEST_DATA_STREAM });
    expect(before.count).toBe(1);

    const initializer = new DatastreamInitializer(logger, esClient, v7Definition);
    await initializer.initialize();

    // All legacy docs wiped
    const after = await esClient.count({ index: TEST_DATA_STREAM });
    expect(after.count).toBe(0);

    // episode.id should be an alias in the live mapping
    const mappingResponse = await esClient.indices.getMapping({ index: TEST_DATA_STREAM });
    const backingIndex = Object.keys(mappingResponse)[0];
    // JSON.parse/stringify converts to plain any so we can navigate without a cast
    const mappingJson = JSON.parse(
      JSON.stringify(mappingResponse[backingIndex].mappings.properties)
    );
    expect(mappingJson?.episode?.properties?.id?.type).toBe('alias');
    expect(mappingJson?.episode?.properties?.id?.path).toBe('alert.id');
  });

  it('queries via episode.* aliases resolve to alert.* source fields after migration', async () => {
    const esClient = esServer.getClient();
    await seedLegacyDataStream();

    const initializer = new DatastreamInitializer(logger, esClient, v7Definition);
    await initializer.initialize();

    // Write a v7 doc using alert.* field names
    await esClient.create({
      index: TEST_DATA_STREAM,
      id: 'new-doc-1',
      document: {
        '@timestamp': new Date().toISOString(),
        alert: { id: 'alert-xyz', status: 'active', status_count: 2 },
        space_id: 'default',
      },
      refresh: true,
    });

    // Query through the episode.id alias — must find the doc
    const byEpisodeId = await esClient.search({
      index: TEST_DATA_STREAM,
      query: { term: { 'episode.id': 'alert-xyz' } },
    });
    expect(byEpisodeId.hits.hits).toHaveLength(1);

    // Query by the canonical alert.id — must also find it
    const byAlertId = await esClient.search({
      index: TEST_DATA_STREAM,
      query: { term: { 'alert.id': 'alert-xyz' } },
    });
    expect(byAlertId.hits.hits).toHaveLength(1);
  });

  it('skips the wipe when episode.id is already an alias (idempotent)', async () => {
    const esClient = esServer.getClient();

    // Fresh v7 install — no legacy data
    const initializer = new DatastreamInitializer(logger, esClient, v7Definition);
    await initializer.initialize();

    await esClient.create({
      index: TEST_DATA_STREAM,
      id: 'doc-1',
      document: {
        '@timestamp': new Date().toISOString(),
        alert: { id: 'alert-1', status: 'active', status_count: 1 },
        space_id: 'default',
      },
      refresh: true,
    });

    const countBefore = await esClient.count({ index: TEST_DATA_STREAM });
    expect(countBefore.count).toBe(1);

    // Re-initialize — must not wipe
    const initializer2 = new DatastreamInitializer(logger, esClient, v7Definition);
    await initializer2.initialize();

    const countAfter = await esClient.count({ index: TEST_DATA_STREAM });
    expect(countAfter.count).toBe(1);
  });

  it('skips the wipe when no template exists (fresh install path)', async () => {
    const esClient = esServer.getClient();

    // No template, no data stream — fresh cluster state
    const initializer = new DatastreamInitializer(logger, esClient, v7Definition);
    await initializer.initialize();

    // Data stream should have been created from scratch with v7 mappings
    const {
      data_streams: [ds],
    } = await esClient.indices.getDataStream({ name: TEST_DATA_STREAM });
    expect(ds).toBeDefined();

    const mappingResponse = await esClient.indices.getMapping({ index: TEST_DATA_STREAM });
    const backingIndex = Object.keys(mappingResponse)[0];
    const mappingJson = JSON.parse(
      JSON.stringify(mappingResponse[backingIndex].mappings.properties)
    );
    expect(mappingJson?.episode?.properties?.id?.type).toBe('alias');
  });
});
