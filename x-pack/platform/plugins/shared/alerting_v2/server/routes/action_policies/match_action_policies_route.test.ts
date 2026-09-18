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
import { MatchActionPoliciesRoute } from './match_action_policies_route';

const createMocks = () => {
  const deps = createRouteDependencies();
  const actionPolicyClient: jest.Mocked<Pick<ActionPolicyClient, 'matchActionPolicies'>> = {
    matchActionPolicies: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      evaluated_count: 0,
      is_truncated: false,
    }),
  };
  return { deps, actionPolicyClient };
};

const buildRoute = (request: KibanaRequest, mocks: ReturnType<typeof createMocks>) =>
  new MatchActionPoliciesRoute(
    mocks.deps.ctx,
    request as any,
    mocks.actionPolicyClient as unknown as ActionPolicyClient
  );

describe('MatchActionPoliciesRoute', () => {
  it('forwards rule.tags from body to the client', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({
      body: { rule: { tags: ['prod', 'infra'] } },
    });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.actionPolicyClient.matchActionPolicies).toHaveBeenCalledWith({
      ruleTags: ['prod', 'infra'],
    });
  });

  it('forwards undefined tags when the body omits rule tags', async () => {
    const mocks = createMocks();
    const request = httpServerMock.createKibanaRequest({ body: { rule: {} } });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.actionPolicyClient.matchActionPolicies).toHaveBeenCalledWith({
      ruleTags: undefined,
    });
  });

  it('returns client result in the response body', async () => {
    const mocks = createMocks();
    const clientResult = {
      items: [{ action_policy: { id: 'ap-1', name: 'AP 1' }, category: 'catch-all' }],
      total: 250,
      evaluated_count: 100,
      is_truncated: true,
    };
    mocks.actionPolicyClient.matchActionPolicies.mockResolvedValue(clientResult as any);

    const request = httpServerMock.createKibanaRequest({
      body: { rule: { tags: ['prod'] } },
    });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    const okCall = (mocks.deps.response.ok as jest.Mock).mock.calls[0][0];
    expect(okCall.body).toEqual(clientResult);
  });

  it('lets errors propagate so BaseAlertingRoute.onError handles the response', async () => {
    const mocks = createMocks();
    mocks.actionPolicyClient.matchActionPolicies.mockRejectedValueOnce(new Error('boom'));

    const request = httpServerMock.createKibanaRequest({
      body: { rule: { tags: ['prod'] } },
    });
    const route = buildRoute(request as unknown as KibanaRequest, mocks);

    await route.handle();

    expect(mocks.deps.response.customError).toHaveBeenCalledTimes(1);
    expect(mocks.deps.response.ok).not.toHaveBeenCalled();
  });
});
