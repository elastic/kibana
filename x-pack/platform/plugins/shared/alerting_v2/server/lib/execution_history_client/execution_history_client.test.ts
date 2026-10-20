/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLogService } from '../services/event_log_service/event_log_service';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { RulesClient } from '../rules_client';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ExecutionHistoryClient } from './execution_history_client';
import type { ListRuleExecutionsArgs } from './types';

const baseArgs = (overrides: Partial<ListRuleExecutionsArgs> = {}): ListRuleExecutionsArgs => ({
  sortField: 'startedAt',
  sortOrder: 'desc',
  page: 1,
  perPage: 20,
  ...overrides,
});

interface Mocks {
  eventLogService: EventLogService;
  findRuleExecutions: jest.SpiedFunction<EventLogService['findRuleExecutions']>;
  findRules: jest.Mock;
  logger: ReturnType<typeof createLoggerService>['mockLogger'];
  client: ExecutionHistoryClient;
}

const createMocks = (spaceId = 'default'): Mocks => {
  const { eventLogService } = createEventLogService();

  const findRuleExecutions = jest
    .spyOn(eventLogService, 'findRuleExecutions')
    .mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

  const findRules = jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, per_page: 500 });
  const rulesClient = { findRules } as unknown as RulesClient;
  const { loggerService, mockLogger } = createLoggerService();

  const client = new ExecutionHistoryClient(eventLogService, spaceId, rulesClient, loggerService);
  return { eventLogService, findRuleExecutions, findRules, logger: mockLogger, client };
};

describe('ExecutionHistoryClient', () => {
  describe('listRuleExecutions', () => {
    it('passes the request space id to the underlying event log service', async () => {
      const { client, findRuleExecutions } = createMocks('space-A');
      await client.listRuleExecutions(baseArgs());
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-A' })
      );
    });

    it('forwards the ruleIds filter to the service call', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.listRuleExecutions(baseArgs({ ruleIds: ['rule-x'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-x'] })
      );
    });

    it('supports filtering on multiple rule ids', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.listRuleExecutions(baseArgs({ ruleIds: ['rule-x', 'rule-y', 'rule-z'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-x', 'rule-y', 'rule-z'] })
      );
    });

    it('omits ruleIds when no rule filter is provided', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.listRuleExecutions(baseArgs());
      expect(findRuleExecutions.mock.calls[0][0]).not.toHaveProperty('ruleIds');
    });

    it('renames the schema outcome (singular, REST convention) to outcomes for the service call', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.listRuleExecutions(baseArgs({ outcomes: ['success', 'failure'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ outcomes: ['success', 'failure'] })
      );
    });

    it('passes through sortField, sortOrder, from, to, paging unchanged', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.listRuleExecutions(
        baseArgs({
          sortField: 'duration',
          sortOrder: 'asc',
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 4,
          perPage: 25,
        })
      );
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'duration',
          sortOrder: 'asc',
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 4,
          perPage: 25,
        })
      );
    });

    it('echoes the service response back to the caller verbatim', async () => {
      const { client, findRuleExecutions } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [],
        total: 137,
        page: 5,
        perPage: 25,
      });
      const result = await client.listRuleExecutions(baseArgs({ page: 5, perPage: 25 }));
      expect(result).toEqual({ total: 137, page: 5, perPage: 25, items: [], searchMatches: null });
    });
  });

  describe('listRuleExecutions with search', () => {
    const RULE_ID = '0b4e1a7c-3f1a-4a52-9a2c-5a3e6d3b8f10';
    const foundRules = (...ids: string[]) => ({
      items: ids.map((id) => ({ id })),
      total: ids.length,
      page: 1,
      per_page: 500,
    });

    it('resolves the search to rule ids and filters the event log by them', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockResolvedValue(foundRules('rule-a', 'rule-b'));

      const result = await client.listRuleExecutions(baseArgs({ search: 'cpu usage' }));

      expect(findRules).toHaveBeenCalledWith({ search: 'cpu usage', perPage: 500 });
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-a', 'rule-b'] })
      );
      expect(findRuleExecutions.mock.calls[0][0]).not.toHaveProperty('search');
      expect(result.searchMatches).toEqual({ rules: 2, isTruncated: false });
    });

    it('also matches a search that is a rule id', async () => {
      const { client, findRuleExecutions } = createMocks();

      await client.listRuleExecutions(baseArgs({ search: RULE_ID }));

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: [RULE_ID] })
      );
    });

    it('also matches a search that is a custom rule id', async () => {
      const { client, findRuleExecutions } = createMocks();

      await client.listRuleExecutions(baseArgs({ search: 'cpu-prod' }));

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['cpu-prod'] })
      );
    });

    it('does not duplicate a rule id that the lookup already found', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockResolvedValue(foundRules(RULE_ID));

      await client.listRuleExecutions(baseArgs({ search: RULE_ID }));

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: [RULE_ID] })
      );
    });

    it('only keeps matching rules that are also in the explicit ruleIds filter', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockResolvedValue(foundRules('rule-a', 'rule-b'));

      await client.listRuleExecutions(baseArgs({ search: 'cpu', ruleIds: ['rule-b', 'rule-c'] }));

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-b'] })
      );
    });

    it('keeps the other filters and paging when searching', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockResolvedValue(foundRules('rule-a'));

      await client.listRuleExecutions(
        baseArgs({
          search: 'cpu',
          outcomes: ['failure'],
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 3,
          perPage: 25,
        })
      );

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          outcomes: ['failure'],
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 3,
          perPage: 25,
          spaceId: 'default',
        })
      );
    });

    it('returns an empty page without querying the event log when nothing matches', async () => {
      const { client, findRuleExecutions } = createMocks();

      const result = await client.listRuleExecutions(
        baseArgs({ search: 'no match', page: 2, perPage: 25 })
      );

      expect(findRuleExecutions).not.toHaveBeenCalled();
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 2,
        perPage: 25,
        searchMatches: { rules: 0, isTruncated: false },
      });
    });

    it('returns an empty page when the matching rules are all outside the ruleIds filter', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockResolvedValue(foundRules('rule-a'));

      const result = await client.listRuleExecutions(
        baseArgs({ search: 'cpu', ruleIds: ['rule-z'] })
      );

      expect(findRuleExecutions).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('flags the result as truncated when more rules match than the id cap', async () => {
      const { client, findRules } = createMocks();
      findRules.mockResolvedValue({ ...foundRules('rule-a'), total: 501 });

      const result = await client.listRuleExecutions(baseArgs({ search: 'cpu' }));

      expect(result.searchMatches).toEqual({ rules: 501, isTruncated: true });
    });

    it('logs a warning and finds nothing when the user cannot read rules', async () => {
      const { client, findRules, findRuleExecutions, logger } = createMocks();
      findRules.mockRejectedValue(SavedObjectsErrorHelpers.decorateForbiddenError(new Error('no')));

      const result = await client.listRuleExecutions(baseArgs({ search: 'no match' }));

      expect(logger.warn).toHaveBeenCalled();
      expect(findRuleExecutions).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('propagates unexpected rule lookup failures', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockRejectedValue(new Error('saved objects timeout'));

      await expect(client.listRuleExecutions(baseArgs({ search: 'cpu' }))).rejects.toThrow(
        'saved objects timeout'
      );
      expect(findRuleExecutions).not.toHaveBeenCalled();
    });

    it('still matches an exact rule id when the user cannot read rules', async () => {
      const { client, findRules, findRuleExecutions } = createMocks();
      findRules.mockRejectedValue(SavedObjectsErrorHelpers.decorateForbiddenError(new Error('no')));

      await client.listRuleExecutions(baseArgs({ search: RULE_ID }));

      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: [RULE_ID] })
      );
    });

    it('does not look up rules when there is no search', async () => {
      const { client, findRules } = createMocks();

      await client.listRuleExecutions(baseArgs());

      expect(findRules).not.toHaveBeenCalled();
    });
  });
});
