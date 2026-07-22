/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
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

describe('ChangeHistoryClient.logBulk', () => {
  const logger = loggingSystemMock.createLogger();
  const defaultConstructorOpts = {
    module: 'workflows',
    dataset: 'definitions',
    logger,
    kibanaVersion: '9.4.0',
  };

  beforeEach(() => {
    FLAGS.FEATURE_ENABLED = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('re-throws the original ES error without wrapping so retry classifiers can read .name', async () => {
    const noLivingConnections = Object.assign(new Error('There are no living connections'), {
      name: 'NoLivingConnectionsError',
    });
    const dataStreamClient = {
      create: jest.fn().mockRejectedValue(noLivingConnections),
    };
    DataStreamClientMock.initialize.mockResolvedValue(dataStreamClient as never);

    const client = new ChangeHistoryClient(defaultConstructorOpts);
    await client.initialize(elasticsearchServiceMock.createElasticsearchClient());

    const thrown = await client
      .logBulk([{ objectType: 'workflow', objectId: 'w1', snapshot: { name: 'w1' } }], {
        action: 'install',
        username: 'kibana',
        spaceId: 'default',
      })
      .catch((err) => err);

    expect(thrown).toBe(noLivingConnections);
    expect(thrown.name).toBe('NoLivingConnectionsError');
  });
});
