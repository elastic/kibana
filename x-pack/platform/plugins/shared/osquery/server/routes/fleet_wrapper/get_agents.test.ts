/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getAgentsRoute } from './get_agents';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

describe('getAgentsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<
    ReturnType<typeof httpServiceMock.createSetupContract>['createRouter']
  >;
  let routeHandler: RequestHandler<unknown, Record<string, unknown>, unknown>;

  const mockListAgents = jest.fn();
  const mockAgentService = {
    asInternalScopedUser: jest.fn().mockReturnValue({ listAgents: mockListAgents }),
  };
  const mockPackagePolicyService = { list: jest.fn() };
  const mockAgentPolicyService = { getByIds: jest.fn() };

  const createMockRequest = (kuery = '') =>
    httpServerMock.createKibanaRequest({
      query: { kuery, page: 1, perPage: 100, showInactive: false },
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgentService.asInternalScopedUser.mockReturnValue({ listAgents: mockListAgents });
    mockPackagePolicyService.list.mockResolvedValue({
      items: [{ package: { version: '1.0.0' }, policy_ids: ['policy-1'] }],
    });
    mockAgentPolicyService.getByIds.mockResolvedValue([
      { id: 'policy-1', name: 'Production Policy' },
    ]);
    mockListAgents.mockResolvedValue({ total: 0, agents: [], aggregations: undefined });

    mockOsqueryContext = {
      logFactory: { get: jest.fn().mockReturnValue({ debug: jest.fn(), error: jest.fn() }) },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getAgentService: jest.fn().mockReturnValue(mockAgentService),
        getPackagePolicyService: jest.fn().mockReturnValue(mockPackagePolicyService),
        getAgentPolicyService: jest.fn().mockReturnValue(mockAgentPolicyService),
      },
    } as unknown as OsqueryAppContext;

    const httpService = httpServiceMock.createSetupContract();
    mockRouter = httpService.createRouter();

    getAgentsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/internal/osquery/fleet_wrapper/agents');
    const routeVersion = route.versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  it('merges version-suffixed policy buckets and resolves the base policy name', async () => {
    mockListAgents.mockResolvedValue({
      total: 7,
      agents: [],
      aggregations: {
        platforms: { buckets: [] },
        policies: {
          buckets: [
            { key: 'policy-1', doc_count: 2 },
            { key: 'policy-1#9.4', doc_count: 5 },
          ],
        },
      },
    });

    const mockResponse = httpServerMock.createResponseFactory();
    await routeHandler({} as never, createMockRequest() as never, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        groups: expect.objectContaining({
          policies: [{ id: 'policy-1', name: 'Production Policy', size: 7 }],
        }),
      }),
    });
  });

  it('expands a policy_name search to match version-suffixed policy ids', async () => {
    const mockResponse = httpServerMock.createResponseFactory();
    // trailing space before ")" mirrors the client kuery shape from use_all_agents.ts
    await routeHandler(
      {} as never,
      createMockRequest('(policy_name:prod )') as never,
      mockResponse
    );

    expect(mockListAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: expect.stringContaining('policy_id:("policy-1" or policy-1#*)'),
      })
    );
  });
});
