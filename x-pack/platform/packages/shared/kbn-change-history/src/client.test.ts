/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, userProfileServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DataStreamClient } from '@kbn/data-streams';
import { FLAGS } from './constants';
import { ChangeHistoryClient } from './client';

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: {
    initialize: jest.fn(),
  },
}));

const DataStreamClientMock = DataStreamClient as jest.Mocked<typeof DataStreamClient>;

describe('ChangeHistoryClient.initialize', () => {
  const logger = loggingSystemMock.createLogger();
  const defaultConstructorOpts = {
    module: 'workflows',
    dataset: 'definitions',
    logger,
    kibanaVersion: '9.4.0',
  };

  beforeEach(() => {
    FLAGS.FEATURE_ENABLED = true;
    DataStreamClientMock.initialize.mockResolvedValue({} as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the data stream with DSL lifecycle enabled and infinite retention', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    const client = new ChangeHistoryClient(defaultConstructorOpts);
    await client.initialize(esClient);

    expect(esClient.ilm.putLifecycle).not.toHaveBeenCalled();
    expect(esClient.ilm.getLifecycle).not.toHaveBeenCalled();
    expect(DataStreamClientMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        dataStream: expect.objectContaining({
          version: 3,
          template: expect.objectContaining({
            mappings: expect.any(Object),
            lifecycle: { enabled: true },
          }),
        }),
      })
    );
    expect(
      DataStreamClientMock.initialize.mock.calls[0]?.[0].dataStream.template.settings
    ).toBeUndefined();
    expect(client.isInitialized()).toBe(true);
  });
});

describe('ChangeHistoryClient.getHistory', () => {
  const logger = loggingSystemMock.createLogger();
  const defaultConstructorOpts = {
    module: 'workflows',
    dataset: 'definitions',
    logger,
    kibanaVersion: '9.4.0',
  };

  const searchResult = {
    hits: {
      total: { value: 1 },
      hits: [
        {
          _source: {
            '@timestamp': '2026-01-01T00:00:00.000Z',
            user: { id: 'uid-1', name: 'alice' },
            event: { id: 'e1', module: 'workflows', dataset: 'definitions', action: 'update' },
            object: { id: 'obj-1', type: 'workflow' },
          },
        },
      ],
    },
  };

  let dataStreamMock: { search: jest.Mock };

  beforeEach(() => {
    FLAGS.FEATURE_ENABLED = true;
    dataStreamMock = { search: jest.fn().mockResolvedValue(searchResult) };
    DataStreamClientMock.initialize.mockResolvedValue(dataStreamMock as never);
  });

  afterEach(() => jest.clearAllMocks());

  it('does not call userProfileService.bulkGet when no service was provided at initialize()', async () => {
    const service = userProfileServiceMock.createStart();
    const client = new ChangeHistoryClient(defaultConstructorOpts);
    await client.initialize(elasticsearchServiceMock.createElasticsearchClient());

    const result = await client.getHistory('default', 'workflow', 'obj-1');

    expect(service.bulkGet).not.toHaveBeenCalled();
    expect(result.items[0].user.full_name).toBeUndefined();
  });

  it('calls userProfileService.bulkGet and enriches full_name when service was provided', async () => {
    const service = userProfileServiceMock.createStart();
    service.bulkGet.mockResolvedValue([
      { uid: 'uid-1', user: { username: 'alice', full_name: 'Alice A.' } } as never,
    ]);
    const client = new ChangeHistoryClient(defaultConstructorOpts);
    await client.initialize(elasticsearchServiceMock.createElasticsearchClient(), {
      userProfileService: service,
    });

    const result = await client.getHistory('default', 'workflow', 'obj-1');

    expect(service.bulkGet).toHaveBeenCalledWith({ uids: new Set(['uid-1']) });
    expect(result.items[0].user.full_name).toBe('Alice A.');
  });
});
