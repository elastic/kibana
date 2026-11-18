/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  ensureSystemEventsStreamsOnce,
  installSystemEventsStreams,
  resetEnsuredSystemEventsNamespaces,
  uninstallSystemEventsStreams,
} from './ensure_system_events_streams';

describe('system events streams', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredSystemEventsNamespaces();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.getDataStream.mockImplementation(
      async ({ name } = {}) => ({ data_streams: name ? [{ name }] : [] } as never)
    );
  });

  it('puts both templates with their retention and creates both streams', async () => {
    await installSystemEventsStreams(esClient, 'default', logger);

    const templates = esClient.indices.putIndexTemplate.mock.calls.map(([t]) => ({
      patterns: t.index_patterns,
      retention: t.template?.lifecycle?.data_retention,
    }));
    expect(templates).toEqual([
      { patterns: ['.entities.v2.system.extraction_runs.default'], retention: '3d' },
      { patterns: ['.entities.v2.system.events.default'], retention: '30d' },
    ]);
    expect(esClient.indices.createDataStream.mock.calls.map(([r]) => r.name)).toEqual([
      '.entities.v2.system.extraction_runs.default',
      '.entities.v2.system.events.default',
    ]);
  });

  it('replaces a plain index at a stream name', async () => {
    esClient.indices.getDataStream.mockResolvedValue({ data_streams: [] } as never);

    await installSystemEventsStreams(esClient, 'default', logger);

    expect(esClient.indices.delete).toHaveBeenCalledWith({
      index: '.entities.v2.system.extraction_runs.default',
    });
  });

  it('does not create streams when Entity Store is not installed', async () => {
    esClient.indices.exists.mockResolvedValue(false);

    await expect(ensureSystemEventsStreamsOnce(esClient, 'default', logger)).resolves.toBe(false);
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('ensures again after uninstall', async () => {
    await ensureSystemEventsStreamsOnce(esClient, 'default', logger);
    await uninstallSystemEventsStreams(esClient, 'default');
    await ensureSystemEventsStreamsOnce(esClient, 'default', logger);

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(4);
    expect(esClient.indices.deleteDataStream).toHaveBeenCalledTimes(2);
    expect(esClient.indices.deleteIndexTemplate).toHaveBeenCalledTimes(2);
  });

  it('returns false instead of throwing when setup fails', async () => {
    esClient.indices.putIndexTemplate.mockRejectedValue(new Error('forbidden'));

    await expect(ensureSystemEventsStreamsOnce(esClient, 'default', logger)).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });
});
