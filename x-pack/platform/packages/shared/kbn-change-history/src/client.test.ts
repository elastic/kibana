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

  describe('logBulk user activity dual write', () => {
    const userActivity = {
      message: 'User updated rule "after" (id: rule-1).',
      event: {
        action: 'alerting_rule_update' as const,
        type: 'change' as const,
        outcome: 'success' as const,
      },
      object: { id: 'rule-1', name: 'after', type: 'rule', tags: ['tag-1'] },
    };
    const changeWithBlock: ObjectChange = {
      objectType: 'alert',
      objectId: 'rule-1',
      snapshot: { name: 'after' },
      userActivity,
    };
    const changeWithoutBlock: ObjectChange = {
      objectType: 'alert',
      objectId: 'rule-2',
      snapshot: { name: 'after' },
    };
    const logOpts = { action: 'rule_update', username: 'alice', spaceId: 'default' };

    const createClientWithTracker = async (trackUserAction: jest.Mock) => {
      const client = new ChangeHistoryClient({ ...defaultConstructorOpts, trackUserAction });
      await client.initialize(elasticsearchServiceMock.createElasticsearchClient());
      return client;
    };

    it('emits one user-activity entry per change carrying a userActivity block after a successful write', async () => {
      const trackUserAction = jest.fn();
      const client = await createClientWithTracker(trackUserAction);

      await client.logBulk([changeWithBlock, changeWithoutBlock], logOpts);

      expect(trackUserAction).toHaveBeenCalledTimes(1);
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });

    it('does not emit anything when no change carries a userActivity block', async () => {
      const trackUserAction = jest.fn();
      const client = await createClientWithTracker(trackUserAction);

      await client.logBulk([changeWithoutBlock], logOpts);

      expect(trackUserAction).not.toHaveBeenCalled();
      expect(dataStreamClientMock.create).toHaveBeenCalledTimes(1);
    });

    it('writes change history normally when no tracker was injected even if a block is present', async () => {
      const client = await createInitializedClient();

      await expect(client.logBulk([changeWithBlock], logOpts)).resolves.toBeUndefined();

      expect(dataStreamClientMock.create).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('emits only after the ES bulk create has resolved', async () => {
      const order: string[] = [];
      dataStreamClientMock.create.mockImplementationOnce(async () => {
        order.push('es_create');
      });
      const trackUserAction = jest.fn(() => {
        order.push('track_user_action');
      });
      const client = await createClientWithTracker(trackUserAction);

      await client.logBulk([changeWithBlock], logOpts);

      expect(order).toEqual(['es_create', 'track_user_action']);
    });

    it('does not emit when the ES bulk create fails', async () => {
      dataStreamClientMock.create.mockRejectedValueOnce(new Error('es down'));
      const trackUserAction = jest.fn();
      const client = await createClientWithTracker(trackUserAction);

      await expect(client.logBulk([changeWithBlock], logOpts)).rejects.toThrow('es down');

      expect(trackUserAction).not.toHaveBeenCalled();
    });

    it('swallows tracker errors, warns, and keeps emitting the remaining entries', async () => {
      const trackUserAction = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('tracker exploded');
        })
        .mockImplementationOnce(() => undefined);
      const client = await createClientWithTracker(trackUserAction);
      const secondChangeWithBlock: ObjectChange = {
        ...changeWithoutBlock,
        userActivity: {
          ...userActivity,
          object: { ...userActivity.object, id: 'rule-2' },
        },
      };

      await expect(
        client.logBulk([changeWithBlock, secondChangeWithBlock], logOpts)
      ).resolves.toBeUndefined();

      expect(trackUserAction).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to track user action "alerting_rule_update": Error: tracker exploded'
        )
      );
    });

    it('never persists the userActivity block in the stored document', async () => {
      const trackUserAction = jest.fn();
      const client = await createClientWithTracker(trackUserAction);

      await client.logBulk([changeWithBlock], logOpts);

      const request = dataStreamClientMock.create.mock.calls[0]![0] as {
        documents: Array<Record<string, unknown>>;
      };
      expect(request.documents).toHaveLength(1);
      expect(JSON.stringify(request.documents[0])).not.toContain('userActivity');
      expect(JSON.stringify(request.documents[0])).not.toContain('alerting_rule_update');
    });

    it('computes the same object.hash regardless of the presence of a userActivity block', async () => {
      const trackUserAction = jest.fn();
      const client = await createClientWithTracker(trackUserAction);

      await client.logBulk([changeWithBlock, changeWithoutBlock], logOpts);

      const request = dataStreamClientMock.create.mock.calls[0]![0] as {
        documents: Array<{ object: { hash: string } }>;
      };
      expect(request.documents).toHaveLength(2);
      expect(request.documents[0]!.object.hash).toBe(request.documents[1]!.object.hash);
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

  describe('getHistoryByFields', () => {
    it('builds a terms aggregation and returns parsed buckets for a single field', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          'user.name': {
            sum_other_doc_count: 3,
            buckets: [
              { key: 'alice', doc_count: 2 },
              { key: 'bob', doc_count: 1 },
            ],
          },
        },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name'], {
        size: 25,
      });

      expect(dataStreamClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          size: 0,
          aggregations: {
            'user.name': {
              terms: {
                field: 'user.name',
                size: 25,
                order: { _count: 'desc' },
              },
            },
          },
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
      expect(result.results).toEqual([
        {
          field: 'user.name',
          buckets: [
            { key: 'alice', docCount: 2 },
            { key: 'bob', docCount: 1 },
          ],
          sumOtherDocCount: 3,
        },
      ]);
    });

    it('returns empty buckets when aggregations are missing', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name']);

      expect(result.results).toEqual([
        {
          field: 'user.name',
          buckets: [],
          sumOtherDocCount: 0,
        },
      ]);
    });

    it('returns empty buckets and warns when aggregation shape is unexpected', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          'user.name': { value: 42 },
        },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name']);

      expect(result.results).toEqual([
        {
          field: 'user.name',
          buckets: [],
          sumOtherDocCount: 0,
        },
      ]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected aggregation shape for change history field [user.name]')
      );
    });

    it('skips non-string bucket keys and warns', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          'user.name': {
            sum_other_doc_count: 0,
            buckets: [
              { key: 123, doc_count: 1 },
              { key: 'alice', doc_count: 2 },
            ],
          },
        },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name']);

      expect(result.results[0]?.buckets).toEqual([{ key: 'alice', docCount: 2 }]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping unexpected bucket for change history field [user.name]')
      );
    });

    it('accepts empty string bucket keys', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          'user.name': {
            sum_other_doc_count: 0,
            buckets: [{ key: '', doc_count: 1 }],
          },
        },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name']);

      expect(result.results[0]?.buckets).toEqual([{ key: '', docCount: 1 }]);
    });

    it('builds sibling terms aggregations for multiple fields in one search', async () => {
      dataStreamClientMock.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          'user.name': {
            sum_other_doc_count: 0,
            buckets: [{ key: 'alice', doc_count: 2 }],
          },
          'event.action': {
            sum_other_doc_count: 1,
            buckets: [
              { key: 'rule_update', doc_count: 3 },
              { key: 'rule_create', doc_count: 1 },
            ],
          },
        },
      });

      const client = await createInitializedClient();
      const result = await client.getHistoryByFields(
        'default',
        'alert',
        'rule-1',
        ['user.name', 'event.action', 'user.name'],
        { size: 10 }
      );

      expect(dataStreamClientMock.search).toHaveBeenCalledTimes(1);
      expect(dataStreamClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 0,
          aggregations: {
            'user.name': {
              terms: { field: 'user.name', size: 10, order: { _count: 'desc' } },
            },
            'event.action': {
              terms: { field: 'event.action', size: 10, order: { _count: 'desc' } },
            },
          },
        })
      );
      expect(result.results).toEqual([
        {
          field: 'user.name',
          buckets: [{ key: 'alice', docCount: 2 }],
          sumOtherDocCount: 0,
        },
        {
          field: 'event.action',
          buckets: [
            { key: 'rule_update', docCount: 3 },
            { key: 'rule_create', docCount: 1 },
          ],
          sumOtherDocCount: 1,
        },
      ]);
    });

    it('returns empty results without searching when fields is empty', async () => {
      const client = await createInitializedClient();
      const result = await client.getHistoryByFields('default', 'alert', 'rule-1', []);

      expect(result).toEqual({ results: [] });
      expect(dataStreamClientMock.search).not.toHaveBeenCalled();
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
