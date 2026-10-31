/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RestoreRuleChangeParams, RestoreRuleChangeQuery } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../../lib/rules_client';
import { createRuleChangesHistoryClientMock } from '../../lib/rule_changes_history/rule_changes_history_client.mock';
import { createRouteDependencies } from '../test_utils';
import { RestoreRuleChangeRoute } from './restore_rule_change_route';

const restoredRule = { id: 'rule-1', version: 4 };

const createMocks = () => {
  const { ctx } = createRouteDependencies();
  const ruleChangesHistoryClient = createRuleChangesHistoryClientMock();
  ruleChangesHistoryClient.getRuleChangeSnapshot.mockResolvedValue({
    ruleId: 'rule-1',
    snapshot: { id: 'rule-1', metadata: { name: 'A' } },
  });
  const rulesClient = {
    restoreRule: jest.fn().mockResolvedValue(restoredRule),
  } as unknown as jest.Mocked<Pick<RulesClient, 'restoreRule'>>;
  return { ctx, ruleChangesHistoryClient, rulesClient };
};

const buildRoute = (query: RestoreRuleChangeQuery, mocks: ReturnType<typeof createMocks>) =>
  new RestoreRuleChangeRoute(
    mocks.ctx,
    httpServerMock.createKibanaRequest<RestoreRuleChangeParams, RestoreRuleChangeQuery, unknown>({
      params: { change_id: 'event-1' },
      query,
    }),
    mocks.ruleChangesHistoryClient,
    mocks.rulesClient as unknown as RulesClient
  );

describe('RestoreRuleChangeRoute', () => {
  it('restores the snapshot of the change onto its rule and returns the rule', async () => {
    const mocks = createMocks();

    await buildRoute({ current_version: 3 }, mocks).handle();

    expect(mocks.ruleChangesHistoryClient.getRuleChangeSnapshot).toHaveBeenCalledWith({
      eventId: 'event-1',
    });
    expect(mocks.rulesClient.restoreRule).toHaveBeenCalledWith({
      id: 'rule-1',
      snapshot: { id: 'rule-1', metadata: { name: 'A' } },
      currentVersion: 3,
    });
    expect(mocks.ctx.response.ok).toHaveBeenCalledWith({ body: restoredRule });
  });

  it('restores without a version guard when current_version is omitted', async () => {
    const mocks = createMocks();

    await buildRoute({}, mocks).handle();

    expect(mocks.rulesClient.restoreRule).toHaveBeenCalledWith(
      expect.objectContaining({ currentVersion: undefined })
    );
  });

  it('does not touch the rule when the change cannot be found', async () => {
    const mocks = createMocks();
    mocks.ruleChangesHistoryClient.getRuleChangeSnapshot.mockRejectedValue(
      Boom.notFound('Rule change with event id "event-1" not found')
    );

    await buildRoute({}, mocks).handle();

    expect(mocks.rulesClient.restoreRule).not.toHaveBeenCalled();
    expect(mocks.ctx.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 })
    );
  });

  it('maps a rules client conflict onto the error response', async () => {
    const mocks = createMocks();
    mocks.rulesClient.restoreRule.mockRejectedValue(Boom.conflict('stale'));

    await buildRoute({ current_version: 1 }, mocks).handle();

    expect(mocks.ctx.response.ok).not.toHaveBeenCalled();
    expect(mocks.ctx.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 })
    );
  });
});
