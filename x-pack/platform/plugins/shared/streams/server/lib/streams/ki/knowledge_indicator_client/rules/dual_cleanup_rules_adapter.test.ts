/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { DualCleanupRulesAdapter } from './dual_cleanup_rules_adapter';
import {
  STREAMS_RULE_CONSUMER,
  STREAMS_ESQL_RULE_TYPE_ID,
  type IRulesManagementClient,
  type CreateRuleBody,
  type UpdateRuleBody,
} from './rules_management_client';

function makeMockClient(): jest.Mocked<IRulesManagementClient> {
  return {
    createRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
    bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
    findOwnedRuleIds: jest.fn().mockResolvedValue([]),
  };
}

const createBody: CreateRuleBody = {
  name: 'Test',
  consumer: STREAMS_RULE_CONSUMER,
  alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
  actions: [] as never[],
  params: { timestampField: '@timestamp', query: 'FROM logs-* | LIMIT 1' },
  enabled: true,
  tags: ['streams'],
  schedule: { interval: '1m' },
};

const updateBody: UpdateRuleBody = {
  name: 'Updated',
  actions: [] as never[],
  params: { timestampField: '@timestamp', query: 'FROM logs-* | LIMIT 1' },
  tags: ['streams'],
  schedule: { interval: '1m' },
};

const logger = loggerMock.create();

describe('DualCleanupRulesAdapter', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createRule', () => {
    it('creates on primary and deletes the legacy counterpart', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await adapter.createRule('id-1', createBody);

      expect(primary.createRule).toHaveBeenCalledWith('id-1', createBody);
      expect(legacy.createRule).not.toHaveBeenCalled();
      expect(legacy.bulkDeleteRules).toHaveBeenCalledWith(['id-1']);
    });

    it('swallows legacy cleanup errors without affecting the primary result', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      legacy.bulkDeleteRules.mockRejectedValueOnce(new Error('legacy 404'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.createRule('id-1', createBody)).resolves.toBeUndefined();
      expect(primary.createRule).toHaveBeenCalledWith('id-1', createBody);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Legacy rule cleanup for "id-1" failed')
      );
    });

    it('propagates primary create errors without attempting legacy cleanup', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.createRule.mockRejectedValueOnce(new Error('primary exploded'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.createRule('id-1', createBody)).rejects.toThrow('primary exploded');
      expect(legacy.bulkDeleteRules).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('updates on primary and deletes the legacy counterpart', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await adapter.updateRule('id-2', updateBody);

      expect(primary.updateRule).toHaveBeenCalledWith('id-2', updateBody);
      expect(legacy.updateRule).not.toHaveBeenCalled();
      expect(legacy.bulkDeleteRules).toHaveBeenCalledWith(['id-2']);
    });

    it('swallows legacy cleanup errors without affecting the primary result', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      legacy.bulkDeleteRules.mockRejectedValueOnce(new Error('legacy 404'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.updateRule('id-2', updateBody)).resolves.toBeUndefined();
      expect(primary.updateRule).toHaveBeenCalledWith('id-2', updateBody);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Legacy rule cleanup for "id-2" failed')
      );
    });

    it('propagates primary update errors without attempting legacy cleanup', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.updateRule.mockRejectedValueOnce(new Error('primary exploded'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.updateRule('id-2', updateBody)).rejects.toThrow('primary exploded');
      expect(legacy.bulkDeleteRules).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteRules', () => {
    it('calls both primary and legacy', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await adapter.bulkDeleteRules(['id-1', 'id-2']);

      expect(primary.bulkDeleteRules).toHaveBeenCalledWith(['id-1', 'id-2']);
      expect(legacy.bulkDeleteRules).toHaveBeenCalledWith(['id-1', 'id-2']);
    });

    it('swallows errors from the legacy client and logs a warning', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      legacy.bulkDeleteRules.mockRejectedValueOnce(new Error('legacy gone'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.bulkDeleteRules(['id-1'])).resolves.toBeUndefined();
      expect(primary.bulkDeleteRules).toHaveBeenCalledWith(['id-1']);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Legacy rule cleanup failed')
      );
    });

    it('propagates errors from the primary client', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.bulkDeleteRules.mockRejectedValueOnce(new Error('primary failed'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.bulkDeleteRules(['id-1'])).rejects.toThrow('primary failed');
    });
  });

  describe('findOwnedRuleIds', () => {
    it('unions ids from primary and legacy', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.findOwnedRuleIds.mockResolvedValueOnce(['r-1', 'r-2']);
      legacy.findOwnedRuleIds.mockResolvedValueOnce(['r-3']);
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids.sort()).toEqual(['r-1', 'r-2', 'r-3']);
      expect(primary.findOwnedRuleIds).toHaveBeenCalledWith('my-stream');
      expect(legacy.findOwnedRuleIds).toHaveBeenCalledWith('my-stream');
    });

    it('dedupes ids that appear on both sides', async () => {
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.findOwnedRuleIds.mockResolvedValueOnce(['r-1']);
      legacy.findOwnedRuleIds.mockResolvedValueOnce(['r-1']);
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1']);
    });

    it('propagates errors from the legacy client instead of silently returning a partial union', async () => {
      // Unlike bulkDeleteRules/cleanupLegacyRule, this must not degrade on legacy failure.
      const primary = makeMockClient();
      const legacy = makeMockClient();
      primary.findOwnedRuleIds.mockResolvedValueOnce(['r-1']);
      legacy.findOwnedRuleIds.mockRejectedValueOnce(new Error('legacy gone'));
      const adapter = new DualCleanupRulesAdapter(primary, legacy, logger);

      await expect(adapter.findOwnedRuleIds('my-stream')).rejects.toThrow('legacy gone');
    });
  });
});
