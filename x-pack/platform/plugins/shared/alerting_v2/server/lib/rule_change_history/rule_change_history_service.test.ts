/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ChangeHistoryClient } from '@kbn/change-history';
import { RULE_CHANGE_HISTORY_OBJECT_TYPE } from './constants';
import { RuleChangeHistoryService } from './rule_change_history_service';
import type { LogRuleChangesParams } from './types';

const createMockClient = () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  logBulk: jest.fn().mockResolvedValue(undefined),
});

const snapshot: Record<string, unknown> = { id: 'rule-1', metadata: { name: 'my rule' } };

describe('RuleChangeHistoryService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let clientMock: ReturnType<typeof createMockClient>;
  let service: RuleChangeHistoryService;

  const baseParams: LogRuleChangesParams = {
    spaceId: 'default',
    author: { uid: 'user-1', username: 'alice' },
    entries: [{ id: 'rule-1', snapshot, sequence: 3 }],
    action: 'rule_update',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clientMock = createMockClient();
    logger = loggingSystemMock.createLogger();
    service = new RuleChangeHistoryService(logger, clientMock as unknown as ChangeHistoryClient);
  });

  describe('logRuleChanges', () => {
    it('does not call logBulk when there are no entries', async () => {
      await service.logRuleChanges({ ...baseParams, entries: [] });

      expect(clientMock.logBulk).not.toHaveBeenCalled();
    });

    it('falls back to an empty username and undefined userProfileId when no author profile is resolved', async () => {
      await service.logRuleChanges({ ...baseParams, author: { uid: null, username: null } });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).toMatchObject({ username: '', userProfileId: undefined });
    });

    it('passes through the resolved author username and uid', async () => {
      await service.logRuleChanges(baseParams);

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).toMatchObject({ username: 'alice', userProfileId: 'user-1' });
    });

    it('includes correlationId only when it is provided', async () => {
      await service.logRuleChanges({ ...baseParams, correlationId: 'corr-1' });

      const [, optsWithCorrelation] = clientMock.logBulk.mock.calls[0];
      expect(optsWithCorrelation).toMatchObject({ correlationId: 'corr-1' });

      clientMock.logBulk.mockClear();
      await service.logRuleChanges(baseParams);

      const [, optsWithoutCorrelation] = clientMock.logBulk.mock.calls[0];
      expect(optsWithoutCorrelation).not.toHaveProperty('correlationId');
    });

    it('omits `data` entirely when neither metadata nor eventType is provided', async () => {
      await service.logRuleChanges(baseParams);

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).not.toHaveProperty('data');
    });

    it('builds `data` with only `metadata` when eventType is absent', async () => {
      await service.logRuleChanges({ ...baseParams, metadata: { source: 'ui' } });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts.data).toEqual({ metadata: { source: 'ui' } });
    });

    it('builds `data` with only `event.type` when metadata is absent', async () => {
      await service.logRuleChanges({ ...baseParams, eventType: 'creation' });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts.data).toEqual({ event: { type: 'creation' } });
    });

    it('combines metadata and eventType into a single `data` object when both are provided', async () => {
      await service.logRuleChanges({
        ...baseParams,
        metadata: { source: 'ui' },
        eventType: 'deletion',
      });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts.data).toEqual({ event: { type: 'deletion' }, metadata: { source: 'ui' } });
    });

    it('maps each entry to an ObjectChange using the service objectType and a normalized ISO timestamp', async () => {
      const timestamp = new Date('2024-01-01T00:00:00.000Z');
      const secondSnapshot: Record<string, unknown> = { id: 'rule-2' };

      await service.logRuleChanges({
        ...baseParams,
        entries: [
          { id: 'rule-1', snapshot, sequence: 3 },
          { id: 'rule-2', snapshot: secondSnapshot },
        ],
        timestamp,
      });

      const [changes] = clientMock.logBulk.mock.calls[0];
      expect(changes).toEqual([
        {
          objectType: RULE_CHANGE_HISTORY_OBJECT_TYPE,
          objectId: 'rule-1',
          timestamp: timestamp.toISOString(),
          sequence: 3,
          snapshot,
        },
        {
          objectType: RULE_CHANGE_HISTORY_OBJECT_TYPE,
          objectId: 'rule-2',
          timestamp: timestamp.toISOString(),
          sequence: undefined,
          snapshot: secondSnapshot,
        },
      ]);
    });

    it('normalizes string and numeric timestamps to an ISO string', async () => {
      await service.logRuleChanges({ ...baseParams, timestamp: '2024-06-01T12:00:00.000Z' });

      const [changesFromString] = clientMock.logBulk.mock.calls[0];
      expect(changesFromString[0].timestamp).toBe('2024-06-01T12:00:00.000Z');

      clientMock.logBulk.mockClear();
      const epochMs = Date.parse('2024-06-01T12:00:00.000Z');
      await service.logRuleChanges({ ...baseParams, timestamp: epochMs });

      const [changesFromNumber] = clientMock.logBulk.mock.calls[0];
      expect(changesFromNumber[0].timestamp).toBe('2024-06-01T12:00:00.000Z');
    });

    it('logs a warning and does not throw when logBulk rejects', async () => {
      clientMock.logBulk.mockRejectedValueOnce(new Error('es unreachable'));

      await expect(service.logRuleChanges(baseParams)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unable to log rule change history for action "rule_update"')
      );
    });
  });

  describe('initialize', () => {
    it('initializes the underlying client and logs success', async () => {
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      service.initialize(elasticsearchClient);
      await new Promise(process.nextTick);

      expect(clientMock.initialize).toHaveBeenCalledWith(elasticsearchClient);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('initialized'));
    });

    it('logs an error and does not throw when the client fails to initialize', async () => {
      clientMock.initialize.mockRejectedValueOnce(new Error('index creation failed'));
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      service.initialize(elasticsearchClient);
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unable to initialize rule change history'),
        })
      );
    });

    it('does not re-initialize the client on subsequent calls', () => {
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      service.initialize(elasticsearchClient);
      service.initialize(elasticsearchClient);

      expect(clientMock.initialize).toHaveBeenCalledTimes(1);
    });
  });
});
