/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { packagePolicyService } from '../package_policy';

import { createAgentAction } from './actions';
import { getAgentById } from './crud';
import { changeAgentPrivilegeLevel } from './change_privilege_level';

jest.mock('../package_policy');
jest.mock('./crud');
jest.mock('./actions');

const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockedGetAgentById = getAgentById as jest.MockedFunction<typeof getAgentById>;

describe('changeAgentPrivilegeLevel', () => {
  const esClientMock = elasticsearchServiceMock.createInternalClient();
  const soClientMock = savedObjectsClientMock.create();
  const agentId = 'agent-id';
  const policyId = 'policy-id';
  mockedGetAgentById.mockResolvedValue({ policy_id: policyId } as any);

  it('should throw an error if the agent needs root access', async () => {
    mockedPackagePolicyService.findAllForAgentPolicy.mockResolvedValue([
      {
        id: 'package-1',
        package: { name: 'Package 1', requires_root: false },
      },
      {
        id: 'package-2',
        package: { name: 'Package 2', requires_root: true },
      },
    ] as any);

    await expect(
      changeAgentPrivilegeLevel(esClientMock, soClientMock, agentId, {})
    ).rejects.toThrowError(
      `Agent policy ${policyId} contains integrations that require root access: Package 2`
    );
  });

  it('should create a PRIVILEGE_LEVEL_CHANGE action with minimal options if the agent can become unprivileged', async () => {
    mockedPackagePolicyService.findAllForAgentPolicy.mockResolvedValue([
      {
        id: 'package-1',
        package: { requires_root: false },
      },
      {
        id: 'package-2',
        package: { requires_root: false },
      },
    ] as any);
    mockedCreateAgentAction.mockResolvedValue({
      id: 'test-action-id',
      type: 'PRIVILEGE_LEVEL_CHANGE',
      agents: [agentId],
      created_at: new Date().toISOString(),
    });

    const res = await changeAgentPrivilegeLevel(esClientMock, soClientMock, agentId, {});

    expect(mockedCreateAgentAction).toHaveBeenCalledWith(esClientMock, soClientMock, {
      agents: [agentId],
      created_at: expect.any(String),
      type: 'PRIVILEGE_LEVEL_CHANGE',
      data: {
        unprivileged: true,
      },
    });
    expect(res).toEqual({ actionId: 'test-action-id' });
  });

  it('should create a PRIVILEGE_LEVEL_CHANGE action with additional options if the agent can become unprivileged', async () => {
    mockedPackagePolicyService.findAllForAgentPolicy.mockResolvedValue([
      {
        id: 'package-1',
        package: { requires_root: false },
      },
      {
        id: 'package-2',
        package: { requires_root: false },
      },
    ] as any);
    mockedCreateAgentAction.mockResolvedValue({
      id: 'test-action-id',
      type: 'PRIVILEGE_LEVEL_CHANGE',
      agents: [agentId],
      created_at: new Date().toISOString(),
    });

    const options = {
      user_info: { username: 'user', groupname: 'group', password: 'password' },
    };
    const res = await changeAgentPrivilegeLevel(esClientMock, soClientMock, agentId, options);

    expect(mockedCreateAgentAction).toHaveBeenCalledWith(esClientMock, soClientMock, {
      agents: [agentId],
      created_at: expect.any(String),
      type: 'PRIVILEGE_LEVEL_CHANGE',
      data: {
        unprivileged: true,
        user_info: { username: 'user', groupname: 'group' },
      },
      secrets: { user_info: { password: 'password' } },
    });
    expect(res).toEqual({ actionId: 'test-action-id' });
  });
});
