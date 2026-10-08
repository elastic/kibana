/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DataStreamClient } from '@kbn/data-streams';
import { withSpan } from '@kbn/apm-utils';
import { FLAGS } from './constants';
import { ChangeHistoryClient } from './client';
import type { ObjectChange } from './types';

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: {
    initialize: jest.fn(),
  },
}));

jest.mock('@kbn/apm-utils', () => ({
  withSpan: jest.fn(<T>(_opts: unknown, cb: () => Promise<T>) => cb()),
}));

const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

const DataStreamClientMock = DataStreamClient as jest.Mocked<typeof DataStreamClient>;

const dataStreamClientMock = {
  create: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
};

describe('ChangeHistoryClient', () => {
  const logger = loggingSystemMock.createLogger();
  const defaultConstructorOpts = {
    module: 'workflows',
    dataset: 'definitions',
    logger,
    kibanaVersion: '9.4.0',
  };

  const createInitializedClient = async () => {
    const client = new ChangeHistoryClient(defaultConstructorOpts);
    await client.initialize(elasticsearchServiceMock.createElasticsearchClient());
    return client;
  };

  beforeEach(() => {
    FLAGS.FEATURE_ENABLED = true;
    DataStreamClientMock.initialize.mockResolvedValue(dataStreamClientMock as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
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

  describe('logBulk', () => {
    const changes: ObjectChange[] = [
      {
        objectType: 'alert',
        objectId: 'rule-1',
        snapshot: { name: 'after' },
      },
    ];

    it('emits the build_documents span with the supplied labels and writes the built document', async () => {
      const client = await createInitializedClient();

      await client.logBulk(changes, {
        action: 'rule_update',
        username: 'alice',
        spaceId: 'default',
        spanLabels: { solution: 'security', action: 'write' },
      });

      expect(withSpanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'change_history.log_bulk.build_documents',
          labels: { solution: 'security', action: 'write' },
        }),
        expect.any(Function)
      );
      expect(dataStreamClientMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          documents: [
            expect.objectContaining({
              user: { name: 'alice', id: undefined },
              event: expect.objectContaining({
                type: 'change',
                module: 'workflows',
                dataset: 'definitions',
                action: 'rule_update',
              }),
              object: expect.objectContaining({
                id: 'rule-1',
                type: 'alert',
                snapshot: { name: 'after' },
              }),
            }),
          ],
        })
      );
    });

    it('emits the es_bulk_create span with the supplied labels and calls client.create with the request', async () => {
      const client = await createInitializedClient();

      await client.logBulk(changes, {
        action: 'rule_update',
        username: 'alice',
        spaceId: 'default',
        refresh: 'wait_for',
        spanLabels: { solution: 'security', action: 'write' },
      });

      expect(withSpanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'change_history.log_bulk.es_bulk_create',
          type: 'db',
          subtype: 'elasticsearch',
          labels: { solution: 'security', action: 'write' },
        }),
        expect.any(Function)
      );
      expect(dataStreamClientMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ space: 'default', refresh: 'wait_for' })
      );
    });

    it('merges correlationId into the span labels of both spans when supplied', async () => {
      const client = await createInitializedClient();

      await client.logBulk(changes, {
        action: 'rule_update',
        username: 'alice',
        spaceId: 'default',
        correlationId: 'corr-1',
        spanLabels: { solution: 'security', action: 'write' },
      });

      expect(withSpanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'change_history.log_bulk.build_documents',
          labels: { solution: 'security', action: 'write', correlationId: 'corr-1' },
        }),
        expect.any(Function)
      );
      expect(withSpanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'change_history.log_bulk.es_bulk_create',
          labels: { solution: 'security', action: 'write', correlationId: 'corr-1' },
        }),
        expect.any(Function)
      );
    });
  });

  describe('getHistory', () => {
    it('emits the es_search span with the supplied labels and calls client.search with the built query', async () => {
      const client = await createInitializedClient();

      await client.getHistory('default', 'alert', 'rule-1', {
        spanLabels: { solution: 'security', action: 'read' },
      });

      expect(withSpanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'change_history.get_history.es_search',
          type: 'db',
          subtype: 'elasticsearch',
          labels: { solution: 'security', action: 'read' },
        }),
        expect.any(Function)
      );
      expect(dataStreamClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          query: {
            bool: {
              filter: [
                { term: { 'event.module': 'workflows' } },
                { term: { 'event.dataset': 'definitions' } },
                { term: { 'object.type': 'alert' } },
                { term: { 'object.id': 'rule-1' } },
              ],
            },
          },
        })
      );
    });
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
