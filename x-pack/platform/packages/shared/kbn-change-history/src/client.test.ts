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
    DataStreamClientMock.initialize.mockResolvedValue(dataStreamClientMock as never);
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

  describe('APM spans', () => {
    describe('logBulk', () => {
      const changes: ObjectChange[] = [
        {
          objectType: 'alert',
          objectId: 'rule-1',
          snapshot: { name: 'after' },
        },
      ];

      it('emits the change_history.log_bulk.build_documents span with the supplied labels', async () => {
        const client = new ChangeHistoryClient(defaultConstructorOpts);
        await client.initialize(elasticsearchServiceMock.createElasticsearchClient());

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
      });

      it('emits the change_history.log_bulk.es_bulk_create span with the supplied labels', async () => {
        const client = new ChangeHistoryClient(defaultConstructorOpts);
        await client.initialize(elasticsearchServiceMock.createElasticsearchClient());

        await client.logBulk(changes, {
          action: 'rule_update',
          username: 'alice',
          spaceId: 'default',
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
      });
    });

    describe('getHistory', () => {
      it('emits the change_history.get_history.es_search span with the supplied labels', async () => {
        const client = new ChangeHistoryClient(defaultConstructorOpts);
        await client.initialize(elasticsearchServiceMock.createElasticsearchClient());

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
      });
    });
  });
});
