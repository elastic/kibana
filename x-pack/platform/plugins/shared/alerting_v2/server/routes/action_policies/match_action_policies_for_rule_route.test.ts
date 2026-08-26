/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ActionPolicyClient } from '../../lib/action_policy_client';
import { createRouteDependencies } from '../test_utils';
import { MatchActionPoliciesForRuleRoute } from './match_action_policies_for_rule_route';

const createMocks = () => {
  const deps = createRouteDependencies();
  const actionPolicyClient: jest.Mocked<Pick<ActionPolicyClient, 'matchActionPoliciesForRule'>> = {
    matchActionPoliciesForRule: jest.fn().mockResolvedValue({ items: [] }),
  };
  return { deps, actionPolicyClient };
};

const buildRoute = (request: KibanaRequest, mocks: ReturnType<typeof createMocks>) =>
  new MatchActionPoliciesForRuleRoute(
    mocks.deps.ctx,
    request as any,
    mocks.actionPolicyClient as unknown as ActionPolicyClient
  );

describe('MatchActionPoliciesForRuleRoute', () => {
  it('forwards rule.id from body to the client', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({ body: { rule: { id: 'rule-abc' } } });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.actionPolicyClient.matchActionPoliciesForRule).toHaveBeenCalledWith({
      ruleId: 'rule-abc',
      ruleName: undefined,
      ruleTags: undefined,
    });
  });

  it('forwards rule.name and rule.tags from body to the client', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({
      body: { rule: { name: 'My Rule', tags: ['prod', 'infra'] } },
    });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.actionPolicyClient.matchActionPoliciesForRule).toHaveBeenCalledWith({
      ruleId: undefined,
      ruleName: 'My Rule',
      ruleTags: ['prod', 'infra'],
    });
  });

  it('returns client result in the response body', async () => {
    const mocks = createMocks();
    const clientResult = {
      items: [{ actionPolicy: { id: 'ap-1', name: 'AP 1' }, category: 'global' }],
    };
    mocks.actionPolicyClient.matchActionPoliciesForRule.mockResolvedValue(clientResult as any);

    const request = httpServerMock.createKibanaRequest({ body: { rule: { id: 'rule-1' } } });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    const okCall = (mocks.deps.response.ok as jest.Mock).mock.calls[0][0];
    expect(okCall.body).toEqual(clientResult);
  });

  it('lets errors propagate so BaseAlertingRoute.onError handles the response', async () => {
    const mocks = createMocks();
    mocks.actionPolicyClient.matchActionPoliciesForRule.mockRejectedValueOnce(new Error('boom'));

    const request = httpServerMock.createKibanaRequest({ body: { rule: { id: 'rule-1' } } });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.deps.response.customError).toHaveBeenCalledTimes(1);
    expect(mocks.deps.response.ok).not.toHaveBeenCalled();
  });
});
