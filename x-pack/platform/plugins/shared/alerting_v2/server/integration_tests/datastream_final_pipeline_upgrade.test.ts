/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Producers no longer set `@timestamp`; the data stream's `index.final_pipeline` assigns
 * it at ingest. The index template only affects backing indices created after it was
 * installed, so on upgrade `DatastreamInitializer` must also patch the setting onto the
 * backing indices that already exist, otherwise every write to an upgraded deployment
 * is rejected. That path is only observable against a real Elasticsearch, so this boots
 * Elasticsearch (no Kibana), installs a pre-pipeline data stream, runs the initializer,
 * and proves a timestamp-less write lands.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { DatastreamInitializer } from '../lib/services/resource_service/datastream_initializer';
import { getIngestTimestampPipeline } from '../resources/datastreams/ingest_timestamp_pipeline';
import type { ResourceDefinition } from '../resources/datastreams/types';

const DATA_STREAM_NAME = '.alerting-v2-final-pipeline-upgrade-test';
const PREVIOUS_VERSION = 1;

const mappings = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    message: { type: 'keyword' },
  },
} as const;

const resourceDefinition: ResourceDefinition = {
  key: `data_stream:${DATA_STREAM_NAME}`,
  dataStreamName: DATA_STREAM_NAME,
  version: PREVIOUS_VERSION + 1,
  mappings,
  lifecycle: {},
  ingestPipeline: getIngestTimestampPipeline(DATA_STREAM_NAME),
};

describe('DatastreamInitializer index.final_pipeline upgrade', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let logger: Logger;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient();
    logger = loggingSystemMock.createLogger();
  });

  afterAll(async () => {
    await esClient?.indices.deleteDataStream({ name: DATA_STREAM_NAME }, { ignore: [404] });
    await esClient?.indices.deleteIndexTemplate({ name: DATA_STREAM_NAME }, { ignore: [404] });
    await esClient?.ingest.deletePipeline(
      { id: resourceDefinition.ingestPipeline.id },
      { ignore: [404] }
    );
    await esServer?.stop();
  });

  // Mirrors what `@kbn/data-streams` installed before the pipeline existed: a versioned
  // template with no `index.final_pipeline`, and a data stream with one backing index.
  const installPreviousVersion = async (): Promise<string> => {
    await esClient.indices.putIndexTemplate({
      name: DATA_STREAM_NAME,
      index_patterns: [`${DATA_STREAM_NAME}*`],
      data_stream: { hidden: true },
      template: {
        mappings,
        settings: { 'index.number_of_replicas': 0 },
      },
      _meta: { managed: true, version: PREVIOUS_VERSION, previousVersions: [] },
    });
    await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });
    return getBackingIndices().then(([first]) => first);
  };

  const getBackingIndices = async (): Promise<string[]> => {
    const { data_streams: dataStreams } = await esClient.indices.getDataStream({
      name: DATA_STREAM_NAME,
    });
    return dataStreams[0].indices.map(({ index_name: indexName }) => indexName);
  };

  const indexWithoutTimestamp = (message: string) =>
    esClient.index({
      index: DATA_STREAM_NAME,
      document: { message },
      refresh: 'wait_for',
    });

  it('patches existing backing indices so timestamp-less writes succeed after upgrade', async () => {
    const backingIndex = await installPreviousVersion();

    // Sanity check the fixture: without the pipeline the data stream rejects the write.
    await expect(indexWithoutTimestamp('before-upgrade')).rejects.toThrow(/@timestamp/);

    await new DatastreamInitializer(logger, esClient, resourceDefinition).initialize();

    // Upgrade did not roll over, so the pre-existing backing index is still the write index.
    expect(await getBackingIndices()).toEqual([backingIndex]);

    const settings = await esClient.indices.getSettings({ index: backingIndex });
    expect(settings[backingIndex].settings?.index?.final_pipeline).toBe(
      resourceDefinition.ingestPipeline.id
    );

    const { index_templates: templates } = await esClient.indices.getIndexTemplate({
      name: DATA_STREAM_NAME,
    });
    expect(templates[0].index_template._meta?.version).toBe(resourceDefinition.version);
    expect(templates[0].index_template.template?.settings?.index?.final_pipeline).toBe(
      resourceDefinition.ingestPipeline.id
    );

    await indexWithoutTimestamp('after-upgrade');

    const { hits } = await esClient.search<{ '@timestamp'?: string; message: string }>({
      index: DATA_STREAM_NAME,
    });
    expect(hits.hits).toHaveLength(1);
    expect(hits.hits[0]._source?.message).toBe('after-upgrade');
    expect(Number.isNaN(Date.parse(hits.hits[0]._source?.['@timestamp'] ?? ''))).toBe(false);
  });
});
