/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import type { FleetRequestHandlerContext } from '../..';
import type { AgentPolicy } from '../../types';

import { xpackMocks } from '../../mocks';
import { agentPolicyService, appContextService } from '../../services';
import { createAppContextStartContractMock } from '../../mocks';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import {
  getOneAgentPolicyHandler,
  getAgentPoliciesHandler,
  bulkGetAgentPoliciesHandler,
} from './handlers';

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

jest.mock('../../services/agent_policy', () => {
  return {
    agentPolicyService: {
      get: jest.fn(),
      list: jest.fn(),
      getByIds: jest.fn(),
    },
  };
});

jest.mock('../../services/epm/packages', () => {
  return {
    getPackageInfo: jest.fn(),
  };
});

describe('getOneAgentPolicyHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: any;

  const baseAgentPolicy: AgentPolicy = {
    id: 'policy-1',
    name: 'Test Policy',
    status: 'active',
    namespace: 'default',
    revision: 1,
    updated_at: '2023-01-01T00:00:00Z',
    updated_by: 'elastic',
    is_managed: false,
    is_protected: false,
    package_policies: [],
  };

  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    jest.clearAllMocks();

    mockedAgentPolicyService.get.mockResolvedValue(baseAgentPolicy);

    // Setup context with authz
    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: true,
          readAgents: true,
        },
      } as any,
      agentClient: {
        asCurrentUser: {
          listAgents: jest.fn().mockResolvedValue({ total: 0 }),
        } as any,
      },
    });

    request = httpServerMock.createKibanaRequest({
      params: { agentPolicyId: 'policy-1' },
      query: {},
    });
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should not populate min_agent_version when there are no package policies', async () => {
    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [],
    });

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
  });

  it('should populate min_agent_version when package policies have agent version requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'pp-1',
          name: 'Package Policy 1',
          package: { name: 'test-package', version: '1.0.0' },
        } as any,
      ],
    });

    getPackageInfo.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      conditions: { agent: { version: '8.12.0' } },
    });

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.item?.min_agent_version).toBe('8.12.0');
  });

  it('should return undefined for min_agent_version when package policies have no version requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'pp-1',
          name: 'Package Policy 1',
          package: { name: 'test-package', version: '1.0.0' },
        } as any,
      ],
    });

    getPackageInfo.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      conditions: {},
    });

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
  });

  it('should return highest version when multiple package policies have different requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'pp-1',
          name: 'Package Policy 1',
          package: { name: 'test-package-1', version: '1.0.0' },
        } as any,
        {
          id: 'pp-2',
          name: 'Package Policy 2',
          package: { name: 'test-package-2', version: '2.0.0' },
        } as any,
      ],
    });

    getPackageInfo
      .mockResolvedValueOnce({
        name: 'test-package-1',
        version: '1.0.0',
        conditions: { agent: { version: '8.11.0' } },
      })
      .mockResolvedValueOnce({
        name: 'test-package-2',
        version: '2.0.0',
        conditions: { agent: { version: '8.13.0' } },
      });

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    // Should return the highest version (8.13.0)
    expect((callArgs?.body as any)?.item?.min_agent_version).toBe('8.13.0');
  });

  it('should handle package info retrieval failures gracefully', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'pp-1',
          name: 'Package Policy 1',
          package: { name: 'test-package', version: '1.0.0' },
        } as any,
      ],
    });

    getPackageInfo.mockRejectedValue(new Error('Package not found'));

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    // Should not populate min_agent_version when package info fails
    expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
  });

  it('should not populate min_agent_version when user does not have read permissions', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: false,
          readAgents: true,
        },
      } as any,
    });

    mockedAgentPolicyService.get.mockResolvedValue({
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'pp-1',
          name: 'Package Policy 1',
          package: { name: 'test-package', version: '1.0.0' },
        } as any,
      ],
    });

    getPackageInfo.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      conditions: { agent: { version: '8.12.0' } },
    });

    await getOneAgentPolicyHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    // Should not call getPackageInfo when user doesn't have read permissions
    expect(getPackageInfo).not.toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.item?.min_agent_version).toBeUndefined();
  });
});

describe('getAgentPoliciesHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: any;

  const baseAgentPolicy: AgentPolicy = {
    id: 'policy-1',
    name: 'Test Policy',
    status: 'active',
    namespace: 'default',
    revision: 1,
    updated_at: '2023-01-01T00:00:00Z',
    updated_by: 'elastic',
    is_managed: false,
    is_protected: false,
    package_policies: [],
  };

  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    jest.clearAllMocks();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [baseAgentPolicy],
      total: 1,
      page: 1,
      perPage: 20,
    });

    // Setup context with authz
    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: true,
          readAgents: false,
        },
      } as any,
      agentClient: {
        asCurrentUser: {
          listAgents: jest.fn().mockResolvedValue({ total: 0 }),
        } as any,
      },
    });

    request = httpServerMock.createKibanaRequest({
      query: { full: true },
    }) as any;
    request.authzResult = {
      [FLEET_API_PRIVILEGES.AGENT_POLICIES.READ]: true,
    };
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should not populate min_agent_version when withPackagePolicies is false', async () => {
    request.query.full = false;
    request.authzResult = {
      [FLEET_API_PRIVILEGES.AGENT_POLICIES.READ]: true,
    };

    await getAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
  });

  it('should populate min_agent_version for all items when package policies have requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          ...baseAgentPolicy,
          id: 'policy-1',
          package_policies: [
            {
              id: 'pp-1',
              name: 'Package Policy 1',
              package: { name: 'test-package-1', version: '1.0.0' },
            } as any,
          ],
        },
        {
          ...baseAgentPolicy,
          id: 'policy-2',
          package_policies: [
            {
              id: 'pp-2',
              name: 'Package Policy 2',
              package: { name: 'test-package-2', version: '2.0.0' },
            } as any,
          ],
        },
      ],
      total: 2,
      page: 1,
      perPage: 20,
    });

    getPackageInfo
      .mockResolvedValueOnce({
        name: 'test-package-1',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      })
      .mockResolvedValueOnce({
        name: 'test-package-2',
        version: '2.0.0',
        conditions: { agent: { version: '8.13.0' } },
      });

    await getAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBe('8.12.0');
    expect((callArgs?.body as any)?.items?.[1]?.min_agent_version).toBe('8.13.0');
  });

  it('should skip items without package policies', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        baseAgentPolicy, // No package policies
        {
          ...baseAgentPolicy,
          id: 'policy-2',
          package_policies: [
            {
              id: 'pp-1',
              name: 'Package Policy 1',
              package: { name: 'test-package', version: '1.0.0' },
            } as any,
          ],
        },
      ],
      total: 2,
      page: 1,
      perPage: 20,
    });

    getPackageInfo.mockResolvedValue({
      name: 'test-package',
      version: '1.0.0',
      conditions: { agent: { version: '8.12.0' } },
    });

    await getAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
    expect((callArgs?.body as any)?.items?.[1]?.min_agent_version).toBe('8.12.0');
  });

  it('should not populate min_agent_version when user does not have read permissions', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    request.authzResult = {
      [FLEET_API_PRIVILEGES.AGENT_POLICIES.READ]: false,
    };
    request.query.full = false; // Set to false to avoid error when no permissions

    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: false,
          readAgents: false,
        },
      } as any,
    });

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          ...baseAgentPolicy,
          package_policies: [
            {
              id: 'pp-1',
              name: 'Package Policy 1',
              package: { name: 'test-package', version: '1.0.0' },
            } as any,
          ],
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    });

    await getAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    // Should not call getPackageInfo when user doesn't have permissions
    expect(getPackageInfo).not.toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
  });
});

describe('bulkGetAgentPoliciesHandler', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let request: any;

  const baseAgentPolicy: AgentPolicy = {
    id: 'policy-1',
    name: 'Test Policy',
    status: 'active',
    namespace: 'default',
    revision: 1,
    updated_at: '2023-01-01T00:00:00Z',
    updated_by: 'elastic',
    is_managed: false,
    is_protected: false,
    package_policies: [],
  };

  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
    jest.clearAllMocks();

    mockedAgentPolicyService.getByIds.mockResolvedValue([baseAgentPolicy]);

    // Setup context with authz
    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: true,
          readAgents: false,
        },
      } as any,
      agentClient: {
        asCurrentUser: {
          listAgents: jest.fn().mockResolvedValue({ total: 0 }),
        } as any,
      },
    });

    request = httpServerMock.createKibanaRequest({
      body: { ids: ['policy-1'], full: true },
      query: {},
    }) as any;
    request.authzResult = {
      [FLEET_API_PRIVILEGES.AGENT_POLICIES.READ]: true,
    };
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should not populate min_agent_version when withPackagePolicies is false', async () => {
    request.body.full = false;

    await bulkGetAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
  });

  it('should populate min_agent_version for all items when package policies have requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.getByIds.mockResolvedValue([
      {
        ...baseAgentPolicy,
        id: 'policy-1',
        package_policies: [
          {
            id: 'pp-1',
            name: 'Package Policy 1',
            package: { name: 'test-package-1', version: '1.0.0' },
          } as any,
        ],
      },
      {
        ...baseAgentPolicy,
        id: 'policy-2',
        package_policies: [
          {
            id: 'pp-2',
            name: 'Package Policy 2',
            package: { name: 'test-package-2', version: '2.0.0' },
          } as any,
        ],
      },
    ]);

    getPackageInfo
      .mockResolvedValueOnce({
        name: 'test-package-1',
        version: '1.0.0',
        conditions: { agent: { version: '8.12.0' } },
      })
      .mockResolvedValueOnce({
        name: 'test-package-2',
        version: '2.0.0',
        conditions: { agent: { version: '8.13.0' } },
      });

    await bulkGetAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBe('8.12.0');
    expect((callArgs?.body as any)?.items?.[1]?.min_agent_version).toBe('8.13.0');
  });

  it('should return highest version when multiple package policies have different requirements', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    mockedAgentPolicyService.getByIds.mockResolvedValue([
      {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'pp-1',
            name: 'Package Policy 1',
            package: { name: 'test-package-1', version: '1.0.0' },
          } as any,
          {
            id: 'pp-2',
            name: 'Package Policy 2',
            package: { name: 'test-package-2', version: '2.0.0' },
          } as any,
        ],
      },
    ]);

    getPackageInfo
      .mockResolvedValueOnce({
        name: 'test-package-1',
        version: '1.0.0',
        conditions: { agent: { version: '8.11.0' } },
      })
      .mockResolvedValueOnce({
        name: 'test-package-2',
        version: '2.0.0',
        conditions: { agent: { version: '8.13.0' } },
      });

    await bulkGetAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    // Should return the highest version (8.13.0)
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBe('8.13.0');
  });

  it('should not populate min_agent_version when user does not have read permissions', async () => {
    const { getPackageInfo } = jest.requireMock('../../services/epm/packages');

    request.authzResult = {
      [FLEET_API_PRIVILEGES.AGENT_POLICIES.READ]: false,
    };
    request.body.full = false; // Set to false to avoid error when no permissions

    const fleetContext = await context.fleet;
    Object.assign(fleetContext, {
      authz: {
        fleet: {
          readAgentPolicies: false,
          readAgents: false,
        },
      } as any,
    });

    mockedAgentPolicyService.getByIds.mockResolvedValue([
      {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'pp-1',
            name: 'Package Policy 1',
            package: { name: 'test-package', version: '1.0.0' },
          } as any,
        ],
      },
    ]);

    await bulkGetAgentPoliciesHandler(context, request, response);

    expect(response.ok).toHaveBeenCalled();
    // Should not call getPackageInfo when user doesn't have permissions
    expect(getPackageInfo).not.toHaveBeenCalled();
    const callArgs = response.ok.mock.calls[0]?.[0];
    expect((callArgs?.body as any)?.items?.[0]?.min_agent_version).toBeUndefined();
  });
});
