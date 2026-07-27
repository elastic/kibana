/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventLogService } from '../services/event_log_service/event_log_service';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import { ExecutionHistoryClient } from './execution_history_client';
import type { GetRuleExecutionsArgs } from './types';

const baseArgs = (overrides: Partial<GetRuleExecutionsArgs> = {}): GetRuleExecutionsArgs => ({
  sort: 'startedAt',
  sortOrder: 'desc',
  page: 1,
  perPage: 20,
  ...overrides,
});

interface Mocks {
  eventLogService: EventLogService;
  findRuleExecutions: jest.SpiedFunction<EventLogService['findRuleExecutions']>;
  client: ExecutionHistoryClient;
}

const createMocks = (spaceId = 'default'): Mocks => {
  const { eventLogService } = createEventLogService();

  const findRuleExecutions = jest
    .spyOn(eventLogService, 'findRuleExecutions')
    .mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });

  const client = new ExecutionHistoryClient(eventLogService, spaceId);
  return { eventLogService, findRuleExecutions, client };
};

describe('ExecutionHistoryClient', () => {
  describe('getRuleExecutions', () => {
    it('passes the request space id to the underlying event log service', async () => {
      const { client, findRuleExecutions } = createMocks('space-A');
      await client.getRuleExecutions(baseArgs());
      expect(findRuleExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-A' })
      );
    });

    it('forwards the camelCase args to the event log service verbatim (adding spaceId)', async () => {
      const { client, findRuleExecutions } = createMocks('space-A');
      const args = baseArgs({
        ruleIds: ['rule-x', 'rule-y'],
        outcomes: ['success', 'failure'],
        sort: 'duration',
        sortOrder: 'asc',
        from: '2026-06-01T00:00:00Z',
        to: '2026-06-02T00:00:00Z',
        page: 4,
        perPage: 25,
      });

      await client.getRuleExecutions(args);

      expect(findRuleExecutions).toHaveBeenCalledWith({ spaceId: 'space-A', ...args });
    });

    it('echoes the service response back to the caller verbatim', async () => {
      const { client, findRuleExecutions } = createMocks();
      findRuleExecutions.mockResolvedValue({
        items: [],
        total: 137,
        page: 5,
        perPage: 25,
      });
      const result = await client.getRuleExecutions(baseArgs({ page: 5, perPage: 25 }));
      expect(result).toEqual({ total: 137, page: 5, perPage: 25, items: [] });
    });
  });
});
