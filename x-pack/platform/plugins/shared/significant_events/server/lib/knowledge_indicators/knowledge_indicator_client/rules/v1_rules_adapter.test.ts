/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { RulesAdapterV1 } from './v1_rules_adapter';
import {
  STREAMS_RULE_CONSUMER,
  STREAMS_ESQL_RULE_TYPE_ID,
  type CreateRuleBody,
  type UpdateRuleBody,
} from './rules_management_client';

interface StubFindResult {
  data: Array<{ id: string; tags: string[] }>;
  total: number;
  page: number;
  perPage: number;
}

function makeRulesClient(): jest.Mocked<
  Pick<RulesClient, 'create' | 'update' | 'bulkDeleteRules'>
> & { find: jest.MockedFunction<() => Promise<StubFindResult>> } {
  return {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    bulkDeleteRules: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, perPage: 500 }),
  };
}

const createBody: CreateRuleBody = {
  name: 'Test Rule',
  consumer: STREAMS_RULE_CONSUMER,
  alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
  actions: [] as never[],
  params: { timestampField: '@timestamp', query: 'FROM logs-* | LIMIT 1' },
  enabled: true,
  tags: ['streams', 'test'],
  schedule: { interval: '1m' },
};

const updateBody: UpdateRuleBody = {
  name: 'Updated Rule',
  actions: [] as never[],
  params: { timestampField: '@timestamp', query: 'FROM logs-* | LIMIT 1' },
  tags: ['streams', 'test'],
  schedule: { interval: '1m' },
};

describe('RulesAdapterV1', () => {
  describe('createRule', () => {
    it('calls rulesClient.create with the correct params', async () => {
      const rc = makeRulesClient();
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.createRule('rule-id-1', createBody);

      expect(rc.create).toHaveBeenCalledWith({
        data: createBody,
        options: { id: 'rule-id-1' },
      });
    });

    it('falls back to update on 409 Boom conflict', async () => {
      const rc = makeRulesClient();
      rc.create.mockRejectedValueOnce(Boom.conflict('already exists'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.createRule('rule-id-1', createBody);

      expect(rc.create).toHaveBeenCalledTimes(1);
      expect(rc.update).toHaveBeenCalledTimes(1);
      expect(rc.update).toHaveBeenCalledWith({ id: 'rule-id-1', data: createBody });
    });

    it('rethrows non-409 errors', async () => {
      const rc = makeRulesClient();
      rc.create.mockRejectedValueOnce(new Error('server error'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await expect(adapter.createRule('rule-id-1', createBody)).rejects.toThrow('server error');
      expect(rc.update).not.toHaveBeenCalled();
    });

    it('rethrows 500 Boom errors', async () => {
      const rc = makeRulesClient();
      rc.create.mockRejectedValueOnce(Boom.internal('unexpected'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await expect(adapter.createRule('rule-id-1', createBody)).rejects.toThrow('unexpected');
      expect(rc.update).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    it('calls rulesClient.update with the correct params', async () => {
      const rc = makeRulesClient();
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.updateRule('rule-id-2', updateBody);

      expect(rc.update).toHaveBeenCalledWith({ id: 'rule-id-2', data: updateBody });
    });

    it('falls back to create on 404 Boom not found', async () => {
      const rc = makeRulesClient();
      rc.update.mockRejectedValueOnce(Boom.notFound('not found'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.updateRule('rule-id-2', updateBody);

      expect(rc.update).toHaveBeenCalledTimes(1);
      expect(rc.create).toHaveBeenCalledTimes(1);
      expect(rc.create).toHaveBeenCalledWith({
        data: {
          name: updateBody.name,
          consumer: STREAMS_RULE_CONSUMER,
          alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
          actions: updateBody.actions,
          params: updateBody.params,
          enabled: true,
          tags: updateBody.tags,
          schedule: updateBody.schedule,
        },
        options: { id: 'rule-id-2' },
      });
    });

    it('rethrows non-404 errors', async () => {
      const rc = makeRulesClient();
      rc.update.mockRejectedValueOnce(new Error('update exploded'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await expect(adapter.updateRule('rule-id-2', updateBody)).rejects.toThrow('update exploded');
      expect(rc.create).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteRules', () => {
    it('calls rulesClient.bulkDeleteRules with the correct params', async () => {
      const rc = makeRulesClient();
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.bulkDeleteRules(['id-1', 'id-2']);

      expect(rc.bulkDeleteRules).toHaveBeenCalledWith({
        ids: ['id-1', 'id-2'],
        ignoreInternalRuleTypes: false,
      });
    });

    it('is a no-op for an empty array', async () => {
      const rc = makeRulesClient();
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await adapter.bulkDeleteRules([]);

      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('swallows 400 Boom errors', async () => {
      const rc = makeRulesClient();
      rc.bulkDeleteRules.mockRejectedValueOnce(Boom.badRequest('bad ids'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await expect(adapter.bulkDeleteRules(['id-1'])).resolves.toBeUndefined();
    });

    it('rethrows non-400 errors', async () => {
      const rc = makeRulesClient();
      rc.bulkDeleteRules.mockRejectedValueOnce(new Error('storage failure'));
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      await expect(adapter.bulkDeleteRules(['id-1'])).rejects.toThrow('storage failure');
    });
  });

  describe('findOwnedRuleIds', () => {
    it('returns rule ids for the given stream', async () => {
      const rc = makeRulesClient();
      rc.find.mockResolvedValueOnce({
        data: [
          { id: 'r-1', tags: ['streams', 'my-stream'] },
          { id: 'r-2', tags: ['streams', 'my-stream'] },
        ],
        total: 2,
        page: 1,
        perPage: 500,
      });
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1', 'r-2']);
      expect(rc.find).toHaveBeenCalledWith({
        options: expect.objectContaining({
          consumers: [STREAMS_RULE_CONSUMER],
          ruleTypeIds: [STREAMS_ESQL_RULE_TYPE_ID],
          filter: 'alert.attributes.tags: "my-stream"',
          fields: ['id', 'tags'],
        }),
      });
    });

    it('pages through results until all ids are collected', async () => {
      const rc = makeRulesClient();
      rc.find
        .mockResolvedValueOnce({
          data: [{ id: 'r-1', tags: ['streams', 'my-stream'] }],
          total: 2,
          page: 1,
          perPage: 500,
        })
        .mockResolvedValueOnce({
          data: [{ id: 'r-2', tags: ['streams', 'my-stream'] }],
          total: 2,
          page: 2,
          perPage: 500,
        });
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual(['r-1', 'r-2']);
      expect(rc.find).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no rules exist', async () => {
      const rc = makeRulesClient();
      rc.find.mockResolvedValueOnce({ data: [], total: 0, page: 1, perPage: 500 });
      const adapter = new RulesAdapterV1(rc as unknown as RulesClient);

      const ids = await adapter.findOwnedRuleIds('my-stream');

      expect(ids).toEqual([]);
    });
  });
});
