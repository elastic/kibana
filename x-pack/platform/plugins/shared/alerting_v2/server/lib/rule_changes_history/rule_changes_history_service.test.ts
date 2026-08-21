/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ChangeHistoryClient } from '@kbn/change-history';
import { RULE_CHANGES_HISTORY_OBJECT_TYPE } from './constants';
import { RuleChangesHistoryService } from './rule_changes_history_service';
import type { LogRuleChangesParams } from './types';
import { createRuleResponse } from '../test_utils';

const createMockClient = () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  logBulk: jest.fn().mockResolvedValue(undefined),
});

const rule = createRuleResponse({ id: 'rule-1', metadata: { name: 'my rule' } });
const { version: _occVersion, ...snapshot } = rule;

describe('RuleChangesHistoryService', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let clientMock: ReturnType<typeof createMockClient>;
  let service: RuleChangesHistoryService;

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
    service = new RuleChangesHistoryService(logger, clientMock as unknown as ChangeHistoryClient);
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

    it('includes correlationId when it is provided', async () => {
      await service.logRuleChanges({ ...baseParams, correlationId: 'corr-1' });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).toMatchObject({ correlationId: 'corr-1' });
    });

    it('omits correlationId when it is not provided', async () => {
      await service.logRuleChanges(baseParams);

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).not.toHaveProperty('correlationId');
    });

    it('omits `data` entirely when eventType is not provided', async () => {
      await service.logRuleChanges(baseParams);

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts).not.toHaveProperty('data');
    });

    it('builds `data` with `event.type` when eventType is provided', async () => {
      await service.logRuleChanges({ ...baseParams, eventType: 'creation' });

      const [, opts] = clientMock.logBulk.mock.calls[0];
      expect(opts.data).toEqual({ event: { type: 'creation' } });
    });

    it('maps each entry to an ObjectChange using the service objectType and a normalized ISO timestamp', async () => {
      const timestamp = new Date('2024-01-01T00:00:00.000Z');
      const secondRule = createRuleResponse({ id: 'rule-2' });
      const { version: _secondOccVersion, ...secondSnapshot } = secondRule;

      await service.logRuleChanges({
        ...baseParams,
        entries: [
          { id: 'rule-1', snapshot, sequence: 3 },
          { id: 'rule-2', snapshot: secondSnapshot, sequence: 4 },
        ],
        timestamp,
      });

      const [changes] = clientMock.logBulk.mock.calls[0];
      expect(changes).toEqual([
        {
          objectType: RULE_CHANGES_HISTORY_OBJECT_TYPE,
          objectId: 'rule-1',
          timestamp: timestamp.toISOString(),
          sequence: 3,
          snapshot,
        },
        {
          objectType: RULE_CHANGES_HISTORY_OBJECT_TYPE,
          objectId: 'rule-2',
          timestamp: timestamp.toISOString(),
          sequence: 4,
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
    });
  });
});
