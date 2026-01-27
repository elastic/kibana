/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgentPolicyServiceInterface, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { createAgentPolicyMock, createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { getIntegrationNamespaces } from './get_integration_namespaces';

describe('getIntegrationNamespaces', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockSoClient = {} as SavedObjectsClientContract;

  let mockPackagePolicyService: jest.Mocked<PackagePolicyClient>;
  let mockAgentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPackagePolicyService = {
      list: jest.fn(),
    } as unknown as jest.Mocked<PackagePolicyClient>;

    mockAgentPolicyService = {
      getByIds: jest.fn(),
    } as unknown as jest.Mocked<AgentPolicyServiceInterface>;
  });

  it('returns empty map when no integration names provided', async () => {
    const result = await getIntegrationNamespaces({
      logger: mockLogger,
      soClient: mockSoClient,
      packagePolicyService: mockPackagePolicyService,
      agentPolicyService: mockAgentPolicyService,
      integrationNames: [],
    });

    expect(result).toEqual({});
    expect(mockPackagePolicyService.list).not.toHaveBeenCalled();
  });

  it('returns namespaces from package policies and agent policies', async () => {
    const osqueryPolicy = {
      ...createPackagePolicyMock(),
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      namespace: 'default',
      policy_ids: ['policy-a'],
    };
    const otherPolicy = {
      ...createPackagePolicyMock(),
      package: { name: 'other', title: 'Other', version: '1.0.0' },
      namespace: 'custom',
      policy_ids: [],
    };
    const osqueryPolicyWithoutNamespace = {
      ...createPackagePolicyMock(),
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
      namespace: '',
      policy_ids: ['policy-b'],
    };

    mockPackagePolicyService.list.mockResolvedValue({
      items: [osqueryPolicy, otherPolicy, osqueryPolicyWithoutNamespace],
      total: 3,
      page: 1,
      perPage: 10000,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      createAgentPolicyMock({ id: 'policy-b', namespace: 'policy-namespace' }),
    ]);

    const result = await getIntegrationNamespaces({
      logger: mockLogger,
      soClient: mockSoClient,
      packagePolicyService: mockPackagePolicyService,
      agentPolicyService: mockAgentPolicyService,
      integrationNames: ['osquery_manager', 'other'],
    });

    expect(mockPackagePolicyService.list).toHaveBeenCalledWith(mockSoClient, {
      perPage: 10000,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: (osquery_manager OR other)`,
    });
    expect(mockAgentPolicyService.getByIds).toHaveBeenCalledWith(mockSoClient, ['policy-b']);

    expect(result.osquery_manager).toEqual(expect.arrayContaining(['default', 'policy-namespace']));
    expect(result.osquery_manager).toHaveLength(2);
    expect(result.other).toEqual(['custom']);
  });
});
