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
const TEST_DATA_STREAM = '.rule-events-reset-integration-test';

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
  forceReset: undefined,
};

describe('DatastreamInitializer forceReset (integration)', () => {
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

  it('recreates a data stream created from v7 with alert.* fields and episode.* aliases', async () => {
    await seedV7DataStream();
    expect(await getDataStreamVersion()).toBe(7);

    await initialize(currentDefinition);

    expect(await countDocuments()).toBe(0);
    expect(await getDataStreamVersion()).toBe(currentDefinition.version);
    await expectCurrentMapping();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Deleting data stream ${TEST_DATA_STREAM}`)
    );
  });

  it('resolves episode.* queries to alert.* fields and rejects episode.* writes after the reset', async () => {
    await seedV7DataStream();
    await initialize(currentDefinition);

    // No @timestamp: the final pipeline of the recreated data stream sets it.
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
    await seedV7DataStream();
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

  it('does not reset a data stream created from the current version on restart', async () => {
    await initialize(currentDefinition);
    await writeDocument('alert-doc', {
      alert: { id: 'alert-1', status: 'active' },
      space_id: 'default',
    });

    await initialize(currentDefinition);

    expect(await countDocuments()).toBe(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('creates the data stream from the current version on a fresh install', async () => {
    await initialize(currentDefinition);

    expect(await getDataStreamVersion()).toBe(currentDefinition.version);
    await expectCurrentMapping();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('recreates the data stream from the current template when a v7 node writes right after the delete', async () => {
    await seedV7DataStream();

    const esClient = esServer.getClient();
    const { indices } = esClient;
    const deleteDataStream = indices.deleteDataStream.bind(indices);
    let gapWriteError: unknown;
    jest.spyOn(indices, 'deleteDataStream').mockImplementationOnce(async (params) => {
      const response = await deleteDataStream(params);
      // A node still on v7 writes before this node recreates the data stream, so
      // Elasticsearch recreates it from the index template installed at that moment.
      gapWriteError = await writeDocument('v7-gap-doc', {
        episode: { id: 'episode-2', status: 'active' },
        space_id: 'default',
      }).then(
        () => undefined,
        (error: unknown) => error
      );
      return response;
    });

    await new DatastreamInitializer(logger, esClient, currentDefinition).initialize();

    expect(gapWriteError).toMatchObject({ message: expect.stringMatching(/field alias/) });
    expect(await countDocuments()).toBe(0);
    expect(await getDataStreamVersion()).toBe(currentDefinition.version);
    await expectCurrentMapping();
  });

  it('resets a data stream created from v7 after the current index template was installed', async () => {
    await seedV7DataStream();

    // Without the reset, the current template is installed but Elasticsearch rejects turning
    // episode.* into aliases on the existing write index.
    await expect(initialize({ ...currentDefinition, forceReset: undefined })).rejects.toMatchObject(
      { statusCode: 400 }
    );
    expect(await getIndexTemplateVersion()).toBe(currentDefinition.version);
    // The data stream keeps the _meta copied from the template it was created from.
    expect(await getDataStreamVersion()).toBe(7);

    await initialize(currentDefinition);

    expect(await countDocuments()).toBe(0);
    expect(await getDataStreamVersion()).toBe(currentDefinition.version);
    await expectCurrentMapping();
  });
});

describe('DatastreamInitializer forceReset for .alert-actions (integration)', () => {
  // Distinct name to avoid colliding with any running prod/dev data stream.
  const TEST_ACTIONS_DATA_STREAM = '.alert-actions-reset-integration-test';

  const currentActionsDefinition: ResourceDefinition = {
    ...getAlertActionsResourceDefinition(),
    key: `data_stream:${TEST_ACTIONS_DATA_STREAM}`,
    dataStreamName: TEST_ACTIONS_DATA_STREAM,
    finalPipeline: getIngestTimestampPipeline(TEST_ACTIONS_DATA_STREAM),
  };

  // The v6 mapping stored the actor as a keyword.
  const v6ActionsDefinition: ResourceDefinition = {
    ...currentActionsDefinition,
    version: 6,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': { type: 'date' },
        actor: { type: 'keyword' },
        action_type: { type: 'keyword' },
        space_id: { type: 'keyword' },
      },
    },
    forceReset: undefined,
  };

  let esServer: EsTestCluster;
  let logger: MockedLogger;

  const initialize = (definition: ResourceDefinition) =>
    new DatastreamInitializer(logger, esServer.getClient(), definition).initialize();

  const writeDocument = (id: string, document: Record<string, unknown>) =>
    esServer.getClient().create({ index: TEST_ACTIONS_DATA_STREAM, id, document, refresh: true });

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

  it('recreates a data stream created from v6 with the actor object and rejects keyword actors', async () => {
    await initialize(v6ActionsDefinition);
    await writeDocument('v6-doc', {
      '@timestamp': new Date().toISOString(),
      actor: 'u_profile_1',
      action_type: 'ack',
      space_id: 'default',
    });

    await initialize(currentActionsDefinition);

    const esClient = esServer.getClient();
    const { count } = await esClient.count({ index: TEST_ACTIONS_DATA_STREAM });
    expect(count).toBe(0);

    const {
      data_streams: [dataStream],
    } = await esClient.indices.getDataStream({ name: TEST_ACTIONS_DATA_STREAM });
    expect(dataStream._meta?.version).toBe(currentActionsDefinition.version);

    const mappings = await esClient.indices.getMapping({ index: TEST_ACTIONS_DATA_STREAM });
    const [properties] = Object.values(mappings).map((index) => index.mappings.properties);
    expect(properties).toMatchObject({
      actor: {
        properties: {
          type: { type: 'keyword' },
          profile_uid: { type: 'keyword' },
        },
      },
    });

    await writeDocument('v7-doc', {
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
});
