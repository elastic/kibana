/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RuleChangesHistoryClientContract } from '../../lib/rule_changes_history';
import { createRuleChangesHistoryClientMock } from '../../lib/rule_changes_history/rule_changes_history_client.mock';
import { createRouteDependencies } from '../test_utils';
import { ListRuleChangeHistoryRoute } from './list_rule_change_history_route';
import { GetRuleChangeHistoryEventRoute } from './get_rule_change_history_event_route';

const createMocks = () => {
  const deps = createRouteDependencies();
  const ruleChangesHistoryClient = createRuleChangesHistoryClientMock();
  return { deps, ruleChangesHistoryClient };
};

const buildListRoute = (request: KibanaRequest, mocks: ReturnType<typeof createMocks>) =>
  new ListRuleChangeHistoryRoute(
    mocks.deps.ctx,
    request as any,
    mocks.ruleChangesHistoryClient as RuleChangesHistoryClientContract
  );

const buildGetRoute = (request: KibanaRequest, mocks: ReturnType<typeof createMocks>) =>
  new GetRuleChangeHistoryEventRoute(
    mocks.deps.ctx,
    request as any,
    mocks.ruleChangesHistoryClient as RuleChangesHistoryClientContract
  );

describe('ListRuleChangeHistoryRoute', () => {
  it('forwards rule id, page, and per_page to the client', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'rule-1' },
      query: { page: 2, per_page: 25 },
    });
    const route = buildListRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.ruleChangesHistoryClient.listRuleChanges).toHaveBeenCalledWith({
      ruleId: 'rule-1',
      page: 2,
      perPage: 25,
    });
  });

  it('returns the client result in the response body', async () => {
    const mocks = createMocks();
    const clientResult = {
      items: [
        {
          id: 'event-1',
          timestamp: '2026-01-15T12:00:00.000Z',
          actor: { name: 'elastic' },
          action: 'rule_create',
        },
      ],
      total: 1,
    };
    mocks.ruleChangesHistoryClient.listRuleChanges.mockResolvedValue(clientResult);

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'rule-1' },
      query: { page: 1, per_page: 20 },
    });
    const route = buildListRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect((mocks.deps.response.ok as jest.Mock).mock.calls[0][0].body).toEqual(clientResult);
  });

  it('lets errors propagate so BaseAlertingRoute.onError handles the response', async () => {
    const mocks = createMocks();
    mocks.ruleChangesHistoryClient.listRuleChanges.mockRejectedValueOnce(new Error('boom'));
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'rule-1' },
      query: { page: 1, per_page: 20 },
    });
    const route = buildListRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.deps.response.customError).toHaveBeenCalledTimes(1);
    expect(mocks.deps.response.ok).not.toHaveBeenCalled();
  });
});

describe('GetRuleChangeHistoryEventRoute', () => {
  it('forwards rule id and event id to the client', async () => {
    const mocks = createMocks();
    mocks.ruleChangesHistoryClient.getRuleChange.mockResolvedValue({
      id: 'event-1',
      timestamp: '2026-01-15T12:00:00.000Z',
      actor: { name: 'elastic' },
      action: 'rule_create',
      snapshot: { id: 'rule-1' },
    });
    const request = httpServerMock.createKibanaRequest({
      params: { id: 'rule-1', eventId: 'event-1' },
    });
    const route = buildGetRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.ruleChangesHistoryClient.getRuleChange).toHaveBeenCalledWith({
      ruleId: 'rule-1',
      eventId: 'event-1',
    });
  });
});
