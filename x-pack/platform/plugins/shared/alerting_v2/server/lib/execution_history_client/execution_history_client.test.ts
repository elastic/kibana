/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleExecutionsQuery, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { EventLogService } from '../services/event_log_service/event_log_service';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import type { RulesClient } from '../rules_client';
import { createRulesClient } from '../rules_client/rules_client.mock';
import type { RuleExecution } from '../services/event_log_service/types';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { ExecutionHistoryClient } from './execution_history_client';

const baseQuery = (overrides: Partial<GetRuleExecutionsQuery> = {}): GetRuleExecutionsQuery => ({
  sort: 'startedAt',
  sortOrder: 'desc',
  page: 1,
  perPage: 20,
  ...overrides,
});

const buildExecution = (overrides: Partial<RuleExecution> = {}): RuleExecution => ({
  id: 'alerting_v2:rule_executor:default:rule-1:2026-06-23T09:59:50.000Z',
  rule: { id: 'rule-1' },
  spaceId: 'default',
  startedAt: '2026-06-23T09:59:50.000Z',
  endedAt: '2026-06-23T10:00:00.000Z',
  timings: { duration: 10_000, scheduledDelay: 0 },
  outcome: 'success',
  reason: null,
  error: null,
  ...overrides,
});

/**
 * Minimal `RuleResponse`-shaped fixture for the rule-name lookup. The client
 * only reads `id` and `metadata.name`, so anything else is cast filler to
 * keep the tests focused.
 */
const buildRule = (id: string, name: string): RuleResponse =>
  ({ id, metadata: { name } } as unknown as RuleResponse);

interface Mocks {
  eventLogService: EventLogService;
  findRuleExecutions: jest.SpiedFunction<EventLogService['findRuleExecutions']>;
  findRules: jest.SpiedFunction<RulesClient['findRules']>;
  client: ExecutionHistoryClient;
}

const createMocks = (spaceId = 'default'): Mocks => {
  const { eventLogService } = createEventLogService();

  const findRuleExecutions = jest
    .spyOn(eventLogService, 'findRuleExecutions')
    .mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

  const { rulesClient } = createRulesClient();
  const findRules = jest
    .spyOn(rulesClient, 'findRules')
    .mockResolvedValue({ items: [], total: 0, page: 1, perPage: 100 });

  const { loggerService } = createLoggerService();

  const client = new ExecutionHistoryClient(eventLogService, rulesClient, spaceId, loggerService);
  return { eventLogService, findRuleExecutions, findRules, client };
};

describe('ExecutionHistoryClient', () => {
  describe('getRuleExecutions', () => {
    it('passes the request space id to the underlying event log service', async () => {
      const { client, findRuleExecutions } = createMocks('space-A');
      await client.getRuleExecutions(baseQuery());
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-A' })
      );
    });

    it('renames the schema ruleId (singular, REST convention) to ruleIds for the service call', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.getRuleExecutions(baseQuery({ ruleId: ['rule-x'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-x'] })
      );
    });

    it('supports filtering on multiple rule ids', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.getRuleExecutions(baseQuery({ ruleId: ['rule-x', 'rule-y', 'rule-z'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: ['rule-x', 'rule-y', 'rule-z'] })
      );
    });

    it('omits ruleIds when no rule filter is provided', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.getRuleExecutions(baseQuery());
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ ruleIds: undefined })
      );
    });

    it('renames the schema outcome (singular, REST convention) to outcomes for the service call', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.getRuleExecutions(baseQuery({ outcome: ['success', 'failure'] }));
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ outcomes: ['success', 'failure'] })
      );
    });

    it('passes through sort, sortOrder, from, to, paging unchanged', async () => {
      const { client, findRuleExecutions } = createMocks();
      await client.getRuleExecutions(
        baseQuery({
          sort: 'duration',
          sortOrder: 'asc',
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 4,
          perPage: 25,
        })
      );
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'duration',
          sortOrder: 'asc',
          from: '2026-06-01T00:00:00Z',
          to: '2026-06-02T00:00:00Z',
          page: 4,
          perPage: 25,
        })
      );
    });

    it('resolves rule names with a single findRules call per page, deduped on rule id', async () => {
      const { client, findRuleExecutions, findRules } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [
          buildExecution({ rule: { id: 'rule-1' } }),
          buildExecution({ rule: { id: 'rule-1' } }),
          buildExecution({ rule: { id: 'rule-2' } }),
        ],
        total: 3,
        page: 1,
        perPage: 20,
      });
      findRules.mockResolvedValue({
        items: [buildRule('rule-1', 'Rule One'), buildRule('rule-2', 'Rule Two')],
        total: 2,
        page: 1,
        perPage: 100,
      });

      const result = await client.getRuleExecutions(baseQuery());

      expect(findRules).toHaveBeenCalledTimes(1);
      const arg = findRules.mock.calls[0][0]!;
      expect(arg.perPage).toBeGreaterThan(0);
      expect(arg.filter).toContain('rule-1');
      expect(arg.filter).toContain('rule-2');

      expect(result.items.map((i) => i.rule.name)).toEqual(['Rule One', 'Rule One', 'Rule Two']);
    });

    it('maps a deleted / inaccessible rule (absent from findRules result) to rule.name: null', async () => {
      const { client, findRuleExecutions, findRules } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [
          buildExecution({ rule: { id: 'rule-alive' } }),
          buildExecution({ rule: { id: 'rule-gone' } }),
        ],
        total: 2,
        page: 1,
        perPage: 20,
      });
      findRules.mockResolvedValue({
        items: [buildRule('rule-alive', 'Still Around')],
        total: 1,
        page: 1,
        perPage: 100,
      });

      const result = await client.getRuleExecutions(baseQuery());
      expect(result.items.map((i) => i.rule)).toEqual([
        { id: 'rule-alive', name: 'Still Around' },
        { id: 'rule-gone', name: null },
      ]);
    });

    it('falls back to rule.name: null and logs when findRules throws', async () => {
      const { client, findRuleExecutions, findRules } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [buildExecution({ rule: { id: 'rule-1' } })],
        total: 1,
        page: 1,
        perPage: 20,
      });
      const boom = new Error('rules client down');
      findRules.mockRejectedValue(boom);

      const result = await client.getRuleExecutions(baseQuery());
      expect(result.items[0].rule).toEqual({ id: 'rule-1', name: null });
    });

    it('skips the rule-name lookup when the page is empty', async () => {
      const { client, findRuleExecutions, findRules } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        perPage: 20,
      });
      await client.getRuleExecutions(baseQuery());
      expect(findRules).not.toHaveBeenCalled();
    });

    it('echoes total/page/perPage from the service result', async () => {
      const { client, findRuleExecutions } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [],
        total: 137,
        page: 5,
        perPage: 25,
      });
      const result = await client.getRuleExecutions(baseQuery({ page: 5, perPage: 25 }));
      expect(result).toEqual(
        expect.objectContaining({ total: 137, page: 5, perPage: 25, items: [] })
      );
    });
  });
});
