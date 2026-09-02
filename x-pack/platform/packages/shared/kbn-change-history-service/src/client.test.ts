/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { ChangeHistoryClient } from '@kbn/change-history';
import type { DualWriteObjectChange, DualWriteUserActivity } from './types';
import { ChangeHistoryServiceClient } from './client';

jest.mock('@kbn/change-history', () => ({
  ChangeHistoryClient: jest.fn(),
}));

const ChangeHistoryClientMock = ChangeHistoryClient as jest.MockedClass<typeof ChangeHistoryClient>;

interface MockChangeHistoryClient {
  isInitialized: jest.Mock<boolean, []>;
  initialize: jest.Mock<Promise<void>, [unknown]>;
  log: jest.Mock<Promise<void>, [unknown, unknown]>;
  logBulk: jest.Mock<Promise<void>, [unknown, unknown]>;
  getHistory: jest.Mock<Promise<unknown>, [string, string, string, unknown]>;
  getHistoryByFields: jest.Mock<Promise<unknown>, [string, string, string, unknown, unknown]>;
}

const createInnerClientMock = (): MockChangeHistoryClient => ({
  isInitialized: jest.fn().mockReturnValue(true),
  initialize: jest.fn().mockResolvedValue(undefined),
  log: jest.fn().mockResolvedValue(undefined),
  logBulk: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getHistoryByFields: jest.fn().mockResolvedValue({ results: [] }),
});

describe('ChangeHistoryServiceClient', () => {
  const constructorOpts = {
    module: 'stack',
    dataset: 'alerting-rules',
    kibanaVersion: '9.6.0',
  };
  const logOpts = { action: 'rule_update', username: 'alice', spaceId: 'default' };

  const userActivity: DualWriteUserActivity = {
    message: 'User updated rule "after" (id: rule-1).',
    event: { action: 'alerting_rule_update', type: 'change', outcome: 'success' },
    object: { id: 'rule-1', name: 'after', type: 'rule', tags: ['tag-1'] },
  };
  const changeWithBlock: DualWriteObjectChange = {
    objectType: 'alert',
    objectId: 'rule-1',
    snapshot: { name: 'after' },
    userActivity,
  };
  const changeWithoutBlock: DualWriteObjectChange = {
    objectType: 'alert',
    objectId: 'rule-2',
    snapshot: { name: 'after' },
  };

  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let innerClient: MockChangeHistoryClient;

  const createClient = (trackUserAction?: jest.Mock) =>
    new ChangeHistoryServiceClient({ ...constructorOpts, logger, trackUserAction });

  beforeEach(() => {
    jest.clearAllMocks();
    innerClient = createInnerClientMock();
    ChangeHistoryClientMock.mockImplementation(() => innerClient as unknown as ChangeHistoryClient);
    logger = loggingSystemMock.createLogger();
  });

  describe('constructor', () => {
    it('constructs the inner ChangeHistoryClient without the tracker', () => {
      createClient(jest.fn());

      expect(ChangeHistoryClientMock).toHaveBeenCalledTimes(1);
      expect(ChangeHistoryClientMock).toHaveBeenCalledWith({
        module: 'stack',
        dataset: 'alerting-rules',
        kibanaVersion: '9.6.0',
        logger,
      });
    });
  });

  describe('initialize', () => {
    it('delegates to the inner client', async () => {
      const client = createClient();
      const elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();

      await client.initialize(elasticsearchClient);

      expect(innerClient.initialize).toHaveBeenCalledWith(elasticsearchClient);
    });

    it('propagates initialization failures so the caller knows the sink is unavailable', async () => {
      innerClient.initialize.mockRejectedValueOnce(new Error('data stream broken'));
      const client = createClient();

      await expect(
        client.initialize(elasticsearchServiceMock.createElasticsearchClient())
      ).rejects.toThrow('data stream broken');
    });

    it('keeps emitting user activity after a failed initialization', async () => {
      innerClient.initialize.mockRejectedValueOnce(new Error('data stream broken'));
      innerClient.isInitialized.mockReturnValue(false);
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await expect(
        client.initialize(elasticsearchServiceMock.createElasticsearchClient())
      ).rejects.toThrow();

      await client.logBulk(
        [
          {
            objectId: 'obj-1',
            objectType: 'rule',
            snapshot: {},
            userActivity: {
              message: 'User updated rule "test" (id: obj-1).',
              event: { action: 'alerting_rule_update', type: 'change', outcome: 'success' },
              object: { id: 'obj-1', name: 'test', type: 'rule', tags: [] },
            },
          },
        ],
        { action: 'rule_update', username: 'elastic', spaceId: 'default' }
      );

      expect(innerClient.logBulk).not.toHaveBeenCalled();
      expect(trackUserAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('isInitialized', () => {
    it('delegates to the inner client', () => {
      innerClient.isInitialized.mockReturnValue(false);
      const client = createClient();

      expect(client.isInitialized()).toBe(false);
      expect(innerClient.isInitialized).toHaveBeenCalled();
    });
  });

  describe('logBulk history sink', () => {
    it('writes changes to history with the userActivity block stripped', async () => {
      const client = createClient(jest.fn());

      await client.logBulk([changeWithBlock, changeWithoutBlock], logOpts);

      expect(innerClient.logBulk).toHaveBeenCalledTimes(1);
      const [changes, opts] = innerClient.logBulk.mock.calls[0] as [
        Array<Record<string, unknown>>,
        Record<string, unknown>
      ];
      expect(changes).toHaveLength(2);
      for (const change of changes) {
        expect(change).not.toHaveProperty('userActivity');
      }
      expect(changes[0]).toEqual({
        objectType: 'alert',
        objectId: 'rule-1',
        snapshot: { name: 'after' },
      });
      expect(opts).toEqual(logOpts);
    });

    it('does not forward the writeHistory flag to the inner client', async () => {
      const client = createClient();

      await client.logBulk([changeWithoutBlock], { ...logOpts, writeHistory: true });

      const [, opts] = innerClient.logBulk.mock.calls[0] as [unknown, Record<string, unknown>];
      expect(opts).not.toHaveProperty('writeHistory');
    });

    it('skips the history write when writeHistory is false', async () => {
      const client = createClient();

      await client.logBulk([changeWithoutBlock], { ...logOpts, writeHistory: false });

      expect(innerClient.logBulk).not.toHaveBeenCalled();
    });

    it('skips the history write when the inner client is not initialized', async () => {
      innerClient.isInitialized.mockReturnValue(false);
      const client = createClient();

      await client.logBulk([changeWithoutBlock], logOpts);

      expect(innerClient.logBulk).not.toHaveBeenCalled();
    });

    it('swallows history write failures and logs a warning', async () => {
      innerClient.logBulk.mockRejectedValueOnce(new Error('es down'));
      const client = createClient();

      await expect(client.logBulk([changeWithoutBlock], logOpts)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'Error writing change history for action "rule_update": Error: es down'
      );
    });
  });

  describe('logBulk user activity sink', () => {
    it('emits one entry per change carrying a userActivity block', async () => {
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await client.logBulk([changeWithBlock, changeWithoutBlock], logOpts);

      expect(trackUserAction).toHaveBeenCalledTimes(1);
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });

    it('emits nothing when no change carries a block', async () => {
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await client.logBulk([changeWithoutBlock], logOpts);

      expect(trackUserAction).not.toHaveBeenCalled();
    });

    it('writes history normally when no tracker was injected even if a block is present', async () => {
      const client = createClient();

      await expect(client.logBulk([changeWithBlock], logOpts)).resolves.toBeUndefined();

      expect(innerClient.logBulk).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('attempts the history write before emitting activity entries', async () => {
      const order: string[] = [];
      innerClient.logBulk.mockImplementationOnce(async () => {
        order.push('history_write');
      });
      const trackUserAction = jest.fn(() => {
        order.push('track_user_action');
      });
      const client = createClient(trackUserAction);

      await client.logBulk([changeWithBlock], logOpts);

      expect(order).toEqual(['history_write', 'track_user_action']);
    });

    it('still emits when the history write fails', async () => {
      innerClient.logBulk.mockRejectedValueOnce(new Error('es down'));
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await expect(client.logBulk([changeWithBlock], logOpts)).resolves.toBeUndefined();

      expect(trackUserAction).toHaveBeenCalledTimes(1);
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });

    it('still emits when the inner client is not initialized', async () => {
      innerClient.isInitialized.mockReturnValue(false);
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await client.logBulk([changeWithBlock], logOpts);

      expect(innerClient.logBulk).not.toHaveBeenCalled();
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });

    it('still emits when writeHistory is false', async () => {
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await client.logBulk([changeWithBlock], { ...logOpts, writeHistory: false });

      expect(innerClient.logBulk).not.toHaveBeenCalled();
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });

    it('swallows tracker errors, warns, and keeps emitting the remaining entries', async () => {
      const trackUserAction = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('tracker exploded');
        })
        .mockImplementationOnce(() => undefined);
      const client = createClient(trackUserAction);
      const secondChangeWithBlock: DualWriteObjectChange = {
        ...changeWithoutBlock,
        userActivity: { ...userActivity, object: { ...userActivity.object, id: 'rule-2' } },
      };

      await expect(
        client.logBulk([changeWithBlock, secondChangeWithBlock], logOpts)
      ).resolves.toBeUndefined();

      expect(trackUserAction).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to track user action "alerting_rule_update": Error: tracker exploded'
      );
    });
  });

  describe('log', () => {
    it('forwards a single change through logBulk semantics', async () => {
      const trackUserAction = jest.fn();
      const client = createClient(trackUserAction);

      await client.log(changeWithBlock, logOpts);

      expect(innerClient.logBulk).toHaveBeenCalledTimes(1);
      const [changes] = innerClient.logBulk.mock.calls[0] as [
        Array<Record<string, unknown>>,
        unknown
      ];
      expect(changes).toHaveLength(1);
      expect(changes[0]).not.toHaveProperty('userActivity');
      expect(trackUserAction).toHaveBeenCalledWith(userActivity);
    });
  });

  describe('read methods', () => {
    it('getHistory is pure delegation', async () => {
      const result = { items: [{ id: 'doc-1' }], total: 1 };
      innerClient.getHistory.mockResolvedValueOnce(result);
      const client = createClient();
      const opts = { size: 10 };

      await expect(client.getHistory('default', 'alert', 'rule-1', opts)).resolves.toBe(result);

      expect(innerClient.getHistory).toHaveBeenCalledWith('default', 'alert', 'rule-1', opts);
    });

    it('getHistoryByFields is pure delegation', async () => {
      const result = { results: [{ field: 'user.name', buckets: [], sumOtherDocCount: 0 }] };
      innerClient.getHistoryByFields.mockResolvedValueOnce(result);
      const client = createClient();
      const opts = { size: 5 };

      await expect(
        client.getHistoryByFields('default', 'alert', 'rule-1', ['user.name'], opts)
      ).resolves.toBe(result);

      expect(innerClient.getHistoryByFields).toHaveBeenCalledWith(
        'default',
        'alert',
        'rule-1',
        ['user.name'],
        opts
      );
    });
  });
});
