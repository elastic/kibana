/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { getAlertEventsResourceDefinition } from '../../../../resources/datastreams/alert_events';
import { getAlertActionsResourceDefinition } from '../../../../resources/datastreams/alert_actions';
import { getIngestTimestampPipeline } from '../../../../resources/datastreams/ingest_timestamp_pipeline';
import type { ResourceDefinition } from '../../../../resources/datastreams/types';
import { DatastreamInitializer } from '../datastream_initializer';

// Distinct name to avoid colliding with any running prod/dev data stream.
const TEST_DATA_STREAM = '.rule-events-initializer-integration-test';

const currentDefinition: ResourceDefinition = {
  ...getAlertEventsResourceDefinition(),
  key: `data_stream:${TEST_DATA_STREAM}`,
  dataStreamName: TEST_DATA_STREAM,
  finalPipeline: getIngestTimestampPipeline(TEST_DATA_STREAM),
};

// The v7 mapping stored episode.* as concrete fields.
const v7Mappings: MappingsDefinition = {
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

const v7Definition: ResourceDefinition = {
  ...currentDefinition,
  version: 7,
  mappings: v7Mappings,
};

describe('DatastreamInitializer .rule-events (integration)', () => {
  let esServer: EsTestCluster;
  let logger: MockedLogger;

  const initialize = (definition: ResourceDefinition) =>
    new DatastreamInitializer(logger, esServer.getClient(), definition).initialize();

  const writeDocument = (id: string, document: Record<string, unknown>) =>
    esServer.getClient().create({ index: TEST_DATA_STREAM, id, document, refresh: true });

  const countDocuments = async () => {
    const { count } = await esServer.getClient().count({ index: TEST_DATA_STREAM });
    return count;
  };

  const getDataStreamVersion = async () => {
    const {
      data_streams: [dataStream],
    } = await esServer.getClient().indices.getDataStream({ name: TEST_DATA_STREAM });
    return dataStream._meta?.version;
  };

  const getIndexTemplateVersion = async () => {
    const {
      index_templates: [indexTemplate],
    } = await esServer.getClient().indices.getIndexTemplate({ name: TEST_DATA_STREAM });
    return indexTemplate.index_template._meta?.version;
  };

  const getBackingIndicesProperties = async () => {
    const response = await esServer.getClient().indices.getMapping({ index: TEST_DATA_STREAM });
    return Object.values(response).map(({ mappings }) => mappings.properties);
  };

  // Creates the data stream the way v7 did and writes a document with the v7 field names.
  const seedV7DataStream = async () => {
    await initialize(v7Definition);
    await writeDocument('v7-doc', {
      '@timestamp': new Date().toISOString(),
      episode: { id: 'episode-1', status: 'active', status_count: 3 },
      space_id: 'default',
    });
  };

  const expectCurrentMapping = async () => {
    const properties = await getBackingIndicesProperties();
    expect(properties).toHaveLength(1);
    expect(properties[0]).toMatchObject({
      alert: {
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
    });
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(async () => {
    const esClient = esServer.getClient();
    await esClient.indices.deleteDataStream({ name: TEST_DATA_STREAM }, { ignore: [404] });
    await esClient.indices.deleteIndexTemplate({ name: TEST_DATA_STREAM }, { ignore: [404] });
    await esClient.ingest.deletePipeline(
      { id: currentDefinition.finalPipeline.id },
      { ignore: [404] }
    );
  });

  it('creates the data stream from the current version with alert.* fields and episode.* aliases', async () => {
    await initialize(currentDefinition);

    expect(await getDataStreamVersion()).toBe(currentDefinition.version);
    await expectCurrentMapping();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('resolves episode.* queries to alert.* fields and rejects episode.* writes', async () => {
    await initialize(currentDefinition);

    // No @timestamp: the final pipeline sets it.
    await writeDocument('alert-doc', {
      alert: { id: 'alert-1', status: 'active', status_count: 2 },
      space_id: 'default',
    });

    const esClient = esServer.getClient();
    const byEpisodeId = await esClient.search({
      index: TEST_DATA_STREAM,
      query: { term: { 'episode.id': 'alert-1' } },
    });
    expect(byEpisodeId.hits.hits.map(({ _id }) => _id)).toEqual(['alert-doc']);

    const byAlertId = await esClient.search({
      index: TEST_DATA_STREAM,
      query: { term: { 'alert.id': 'alert-1' } },
    });
    expect(byAlertId.hits.hits.map(({ _id }) => _id)).toEqual(['alert-doc']);

    await expect(
      writeDocument('episode-doc', {
        episode: { id: 'episode-2', status: 'active' },
        space_id: 'default',
      })
    ).rejects.toThrow(/field alias/);
  });

  it('resolves episode.* through ES|QL filters, aggregations and grouping like the director and dispatcher queries', async () => {
    await initialize(currentDefinition);

    await writeDocument('alert-1-pending', {
      '@timestamp': '2026-01-01T00:00:00.000Z',
      type: 'alert',
      alert: { id: 'alert-1', status: 'pending', status_count: 1 },
      space_id: 'default',
    });

    await writeDocument('alert-1-active', {
      '@timestamp': '2026-01-01T00:01:00.000Z',
      type: 'alert',
      alert: { id: 'alert-1', status: 'active' },
      space_id: 'default',
    });

    await writeDocument('alert-2-inactive', {
      '@timestamp': '2026-01-01T00:02:00.000Z',
      type: 'alert',
      alert: { id: 'alert-2', status: 'inactive' },
      space_id: 'default',
    });

    await writeDocument('signal', {
      '@timestamp': '2026-01-01T00:03:00.000Z',
      type: 'signal',
      space_id: 'default',
    });

    const { columns, values } = await esServer.getClient().esql.query({
      query: `FROM ${TEST_DATA_STREAM}
        | WHERE type == "alert" AND episode.status IS NOT NULL
        | STATS last_status = LAST(episode.status, @timestamp),
                max_status_count = MAX(episode.status_count),
                events = COUNT(*)
          BY episode.id
        | SORT episode.id ASC`,
    });

    expect(columns.map(({ name }) => name)).toEqual([
      'last_status',
      'max_status_count',
      'events',
      'episode.id',
    ]);
    expect(values).toEqual([
      ['active', 1, 2, 'alert-1'],
      ['inactive', null, 1, 'alert-2'],
    ]);
  });

  it('keeps the documents of an existing data stream on restart', async () => {
    await initialize(currentDefinition);
    await writeDocument('alert-doc', {
      alert: { id: 'alert-1', status: 'active' },
      space_id: 'default',
    });

    await initialize(currentDefinition);

    expect(await countDocuments()).toBe(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('never deletes a data stream created from an incompatible version, and fails initialization instead', async () => {
    await seedV7DataStream();

    // Elasticsearch rejects turning episode.* into aliases on the existing write index.
    await expect(initialize(currentDefinition)).rejects.toMatchObject({ statusCode: 400 });

    expect(await getIndexTemplateVersion()).toBe(currentDefinition.version);
    // The data stream and its documents are untouched.
    expect(await getDataStreamVersion()).toBe(7);
    expect(await countDocuments()).toBe(1);
  });

  describe('data retention', () => {
    const getDataRetention = async () => {
      const {
        data_streams: [{ lifecycle }],
      } = await esServer.getClient().indices.getDataLifecycle({ name: TEST_DATA_STREAM });
      return lifecycle?.data_retention;
    };

    const withRetention = (dataRetention?: string): ResourceDefinition => ({
      ...currentDefinition,
      lifecycle: getAlertEventsResourceDefinition({ dataRetention }).lifecycle,
    });

    it('applies the retention on a fresh install', async () => {
      await initialize(withRetention('90d'));

      expect(await getDataRetention()).toBe('90d');
    });

    it('updates and removes the retention of an existing data stream without a version bump', async () => {
      await initialize(withRetention('90d'));

      await initialize(withRetention('45d'));
      expect(await getDataRetention()).toBe('45d');

      await initialize(withRetention());
      expect(await getDataRetention()).toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});

describe('DatastreamInitializer .alert-actions (integration)', () => {
  // Distinct name to avoid colliding with any running prod/dev data stream.
  const TEST_ACTIONS_DATA_STREAM = '.alert-actions-initializer-integration-test';

  const currentActionsDefinition: ResourceDefinition = {
    ...getAlertActionsResourceDefinition(),
    key: `data_stream:${TEST_ACTIONS_DATA_STREAM}`,
    dataStreamName: TEST_ACTIONS_DATA_STREAM,
    finalPipeline: getIngestTimestampPipeline(TEST_ACTIONS_DATA_STREAM),
  };

  let esServer: EsTestCluster;
  let logger: MockedLogger;

  const initialize = (definition: ResourceDefinition) =>
    new DatastreamInitializer(logger, esServer.getClient(), definition).initialize();

  const writeDocument = (id: string, document: Record<string, unknown>) =>
    esServer.getClient().create({ index: TEST_ACTIONS_DATA_STREAM, id, document, refresh: true });

  const getDataStreamVersion = async () => {
    const {
      data_streams: [dataStream],
    } = await esServer.getClient().indices.getDataStream({ name: TEST_ACTIONS_DATA_STREAM });
    return dataStream._meta?.version;
  };

  const getBackingIndicesProperties = async () => {
    const response = await esServer
      .getClient()
      .indices.getMapping({ index: TEST_ACTIONS_DATA_STREAM });
    return Object.values(response).map(({ mappings }) => mappings.properties);
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(() => {
    logger = loggerMock.create();
  });

  afterEach(async () => {
    const esClient = esServer.getClient();
    await esClient.indices.deleteDataStream({ name: TEST_ACTIONS_DATA_STREAM }, { ignore: [404] });
    await esClient.indices.deleteIndexTemplate(
      { name: TEST_ACTIONS_DATA_STREAM },
      { ignore: [404] }
    );
    await esClient.ingest.deletePipeline(
      { id: currentActionsDefinition.finalPipeline.id },
      { ignore: [404] }
    );
  });

  it('maps the actor as an object and rejects keyword actors', async () => {
    await initialize(currentActionsDefinition);

    expect(await getDataStreamVersion()).toBe(currentActionsDefinition.version);

    const [properties] = await getBackingIndicesProperties();
    expect(properties).toMatchObject({
      actor: {
        properties: {
          type: { type: 'keyword' },
          profile_uid: { type: 'keyword' },
        },
      },
    });

    await writeDocument('object-actor-doc', {
      actor: { type: 'user', profile_uid: 'u_profile_1' },
      action_type: 'ack',
      space_id: 'default',
    });
    await expect(
      writeDocument('keyword-actor-doc', {
        actor: 'u_profile_1',
        action_type: 'ack',
        space_id: 'default',
      })
    ).rejects.toThrow(/object mapping for \[actor\]/);
  });

  it('maps alert_id and alert_status instead of the episode_* fields', async () => {
    await initialize(currentActionsDefinition);

    const properties = await getBackingIndicesProperties();
    expect(properties).toHaveLength(1);
    expect(properties[0]).toMatchObject({
      alert_id: { type: 'keyword' },
      alert_status: { type: 'keyword' },
    });
    expect(properties[0]).not.toHaveProperty('episode_id');
    expect(properties[0]).not.toHaveProperty('episode_status');
  });

  it('indexes alert_id and alert_status and leaves episode_* fields unmapped', async () => {
    await initialize(currentActionsDefinition);

    // No @timestamp: the final pipeline sets it.
    await writeDocument('alert-doc', {
      actor: { type: 'internal' },
      action_type: 'notified',
      alert_id: 'alert-1',
      alert_status: 'active',
      space_id: 'default',
    });

    // `dynamic: false` accepts the old field names but does not index them, and no alias
    // resolves them.
    await writeDocument('episode-doc', {
      actor: { type: 'internal' },
      action_type: 'notified',
      episode_id: 'episode-1',
      episode_status: 'active',
      space_id: 'default',
    });

    const esClient = esServer.getClient();
    const byAlertId = await esClient.esql.query({
      query: `FROM ${TEST_ACTIONS_DATA_STREAM}
        | WHERE alert_id IS NOT NULL
        | STATS alert_status = LAST(alert_status, @timestamp) BY alert_id`,
    });
    expect(byAlertId.values).toEqual([['active', 'alert-1']]);

    await expect(
      esClient.esql.query({
        query: `FROM ${TEST_ACTIONS_DATA_STREAM} | WHERE episode_id == "episode-1"`,
      })
    ).rejects.toThrow(/Unknown column \[episode_id\]/);
  });

  it('reads actor.type and actor.profile_uid through ES|QL like the actions history and attribution queries', async () => {
    await initialize(currentActionsDefinition);

    // Explicit timestamps so LAST(..., @timestamp) is deterministic.
    await writeDocument('user-ack', {
      '@timestamp': '2026-01-01T00:00:00.000Z',
      actor: { type: 'user', profile_uid: 'u_profile_1' },
      action_type: 'ack',
      alert_id: 'alert-1',
      space_id: 'default',
    });

    await writeDocument('internal-suppress', {
      '@timestamp': '2026-01-01T00:01:00.000Z',
      actor: { type: 'internal' },
      action_type: 'suppress',
      alert_id: 'alert-1',
      space_id: 'default',
    });

    const esClient = esServer.getClient();

    // Projection used by the actions history query.
    const history = await esClient.esql.query({
      query: `FROM ${TEST_ACTIONS_DATA_STREAM}
        | KEEP @timestamp, action_type, actor.type, actor.profile_uid
        | SORT @timestamp ASC`,
    });

    expect(history.columns.map(({ name }) => name)).toEqual([
      '@timestamp',
      'action_type',
      'actor.type',
      'actor.profile_uid',
    ]);

    expect(history.values).toEqual([
      ['2026-01-01T00:00:00.000Z', 'ack', 'user', 'u_profile_1'],
      ['2026-01-01T00:01:00.000Z', 'suppress', 'internal', null],
    ]);

    const attribution = await esClient.esql.query({
      query: `FROM ${TEST_ACTIONS_DATA_STREAM}
        | STATS last_ack_actor = LAST(actor.profile_uid, @timestamp) WHERE action_type == "ack",
                internal_actions = COUNT(*) WHERE actor.type == "internal"
          BY alert_id`,
    });

    expect(attribution.values).toEqual([['u_profile_1', 1, 'alert-1']]);
  });
});
