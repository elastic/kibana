/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { actionPolicyRoutingTagsParamsSchema } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyClient } from '../../lib/action_policy_client';
import { ALERTING_V2_API_PRIVILEGES } from '../../lib/security/privileges';
import { createRouteDependencies } from '../test_utils';
import { GetActionPolicyRoutingTagsRoute } from './get_action_policy_routing_tags_route';

const createMocks = () => {
  const deps = createRouteDependencies();
  const actionPolicyClient: jest.Mocked<Pick<ActionPolicyClient, 'getRoutingTags'>> = {
    getRoutingTags: jest.fn().mockResolvedValue({ items: [], total_tags: 0, is_truncated: false }),
  };
  return { deps, actionPolicyClient };
};

const buildRoute = (query: Record<string, unknown>, mocks: ReturnType<typeof createMocks>) =>
  new GetActionPolicyRoutingTagsRoute(
    mocks.deps.ctx,
    httpServerMock.createKibanaRequest({ query }) as unknown as KibanaRequest<any, any, any>,
    mocks.actionPolicyClient as unknown as ActionPolicyClient
  );

describe('GetActionPolicyRoutingTagsRoute', () => {
  it('is an internal route that requires the same privilege as matching action policies', () => {
    expect(GetActionPolicyRoutingTagsRoute.path).toBe(
      '/internal/alerting/v2/action_policies/routing_tags'
    );
    expect(GetActionPolicyRoutingTagsRoute.routeOptions.access).toBe('internal');
    expect(GetActionPolicyRoutingTagsRoute.security).toEqual({
      authz: { requiredPrivileges: [ALERTING_V2_API_PRIVILEGES.actionPolicies.read] },
    });
  });

  it('validates the query strictly', () => {
    const { request } = GetActionPolicyRoutingTagsRoute.schemas;

    expect(request.query.safeParse({ search: 'rna', policies_per_tag: '3' }).success).toBe(true);
    expect(request.query.safeParse({ page: 1 }).success).toBe(false);
    expect(request.query).toBe(actionPolicyRoutingTagsParamsSchema);
  });

  it('forwards search and policies_per_tag to the client', async () => {
    const mocks = createMocks();

    await buildRoute({ search: 'rn', policies_per_tag: 3 }, mocks).handle();

    expect(mocks.actionPolicyClient.getRoutingTags).toHaveBeenCalledWith({
      search: 'rn',
      policiesPerTag: 3,
    });
  });

  it('forwards an undefined search when the query omits it', async () => {
    const mocks = createMocks();

    await buildRoute({ policies_per_tag: 5 }, mocks).handle();

    expect(mocks.actionPolicyClient.getRoutingTags).toHaveBeenCalledWith({
      search: undefined,
      policiesPerTag: 5,
    });
  });

  it('returns the client result in the response body', async () => {
    const mocks = createMocks();
    const clientResult = {
      items: [{ tag: 'rna', policy_count: 1, policies: [{ id: 'ap-1', name: 'AP 1' }] }],
      total_tags: 1,
      is_truncated: false,
    };
    mocks.actionPolicyClient.getRoutingTags.mockResolvedValue(clientResult);

    await buildRoute({ policies_per_tag: 5 }, mocks).handle();

    const okCall = (mocks.deps.response.ok as jest.Mock).mock.calls[0][0];
    expect(okCall.body).toEqual(clientResult);
  });

  it('lets errors propagate so BaseAlertingRoute.onError handles the response', async () => {
    const mocks = createMocks();
    mocks.actionPolicyClient.getRoutingTags.mockRejectedValueOnce(new Error('boom'));

    await buildRoute({ policies_per_tag: 5 }, mocks).handle();

    expect(mocks.deps.response.customError).toHaveBeenCalledTimes(1);
    expect(mocks.deps.response.ok).not.toHaveBeenCalled();
  });
});
