/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { AgentRequestInvalidError } from '@kbn/fleet-plugin/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentStatusForAgentPolicyRoute } from './get_agent_status_for_agent_policy';

describe('getAgentStatusForAgentPolicyRoute', () => {
  const mockGetAgentStatusForAgentPolicy = jest.fn();
  const mockAgentService = {
    asInternalScopedUser: jest.fn(),
  };

  let routeHandler: RequestHandler<unknown, { policyId?: string; kuery?: string }>;

  const createMockRequest = (query: { policyId?: string; kuery?: string }) =>
    httpServerMock.createKibanaRequest({ query });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgentService.asInternalScopedUser.mockReturnValue({
      getAgentStatusForAgentPolicy: mockGetAgentStatusForAgentPolicy,
    });

    const osqueryContext = {
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default' }),
        getAgentService: jest.fn().mockReturnValue(mockAgentService),
      },
    } as unknown as OsqueryAppContext;

    const router = httpServiceMock.createSetupContract().createRouter();
    getAgentStatusForAgentPolicyRoute(router, osqueryContext);

    const route = router.versioned.getRoute('get', '/internal/osquery/fleet_wrapper/agent_status');
    const routeVersion = route.versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  it('returns the agent status counts', async () => {
    const results = { online: 1, error: 0, offline: 0 };
    mockGetAgentStatusForAgentPolicy.mockResolvedValue(results);
    const response = httpServerMock.createResponseFactory();

    await routeHandler(
      {} as never,
      createMockRequest({
        policyId: 'policy-1',
        kuery: 'local_metadata.host.hostname:foo',
      }) as never,
      response
    );

    expect(mockGetAgentStatusForAgentPolicy).toHaveBeenCalledWith(
      'policy-1',
      'local_metadata.host.hostname:foo'
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { results } });
  });

  it('returns a bad request when Fleet rejects the kuery', async () => {
    mockGetAgentStatusForAgentPolicy.mockRejectedValue(
      new AgentRequestInvalidError('Kuery is not supported: unknown field')
    );
    const response = httpServerMock.createResponseFactory();

    await routeHandler({} as never, createMockRequest({ kuery: 'unknown:foo' }) as never, response);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: 'Kuery is not supported: unknown field' },
    });
  });

  it('rethrows other errors', async () => {
    mockGetAgentStatusForAgentPolicy.mockRejectedValue(new Error('boom'));
    const response = httpServerMock.createResponseFactory();

    await expect(
      routeHandler({} as never, createMockRequest({}) as never, response)
    ).rejects.toThrow('boom');
    expect(response.badRequest).not.toHaveBeenCalled();
  });
});
