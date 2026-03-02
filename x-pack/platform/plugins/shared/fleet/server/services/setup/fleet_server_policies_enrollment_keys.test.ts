/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from '../api_keys';

import { scheduleDeployAgentPoliciesTask } from '../agent_policies/deploy_agent_policies_task';

import { ensureAgentPoliciesFleetServerKeysAndPolicies } from './fleet_server_policies_enrollment_keys';

jest.mock('../app_context');
jest.mock('../agent_policy');
jest.mock('../api_keys');
jest.mock('../agent_policies/bump_agent_policies_task');
jest.mock('../agent_policies/deploy_agent_policies_task');

const mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy = jest.mocked(
  ensureDefaultEnrollmentAPIKeyForAgentPolicy
);

const mockedAgentPolicyService = jest.mocked(agentPolicyService);
const mockedAppContextService = jest.mocked(appContextService);

describe('ensureAgentPoliciesFleetServerKeysAndPolicies', () => {
  beforeEach(() => {
    mockedAppContextService.getSecurity.mockReturnValue({
      authc: { apiKeys: { areAPIKeysEnabled: async () => true } },
    } as any);
    mockedAppContextService.getInternalUserSOClientForSpaceId.mockReturnValue(
      savedObjectsClientMock.create()
    );

    mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy.mockReset();
    mockedAgentPolicyService.getLatestFleetPolicy.mockReset();
    mockedAgentPolicyService.deployPolicies.mockReset();
    mockedAgentPolicyService.deployPolicies.mockImplementation(async () => {});
    jest.mocked(scheduleDeployAgentPoliciesTask).mockReset();
    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'policy1',
          revision: 1,
        },
        {
          id: 'policy2',
          revision: 2,
        },
      ],
    } as any);
  });

  it('should do nothing with policies already deployed', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      if (agentPolicyId === 'policy2') {
        return {
          revision_idx: 2,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(mockedAgentPolicyService.deployPolicies).not.toBeCalled();
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('has mismatched revisions')
    );
  });

  it('should do deploy policies out of sync', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      if (agentPolicyId === 'policy2') {
        return {
          revision_idx: 1,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(scheduleDeployAgentPoliciesTask).toBeCalledWith(undefined, [
      { id: 'policy2', spaceId: undefined },
    ]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Policy [policy2] has mismatched revisions: .kibana_ingest revision [2], .fleet-policies revision_idx [1]'
    );
  });

  it('should do deploy policies never deployed', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'policy1') {
        return {
          revision_idx: 1,
        } as any;
      }

      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedEnsureDefaultEnrollmentAPIKeyForAgentPolicy).toBeCalledTimes(2);
    expect(scheduleDeployAgentPoliciesTask).toBeCalledWith(undefined, [
      { id: 'policy2', spaceId: undefined },
    ]);
  });

  it('should synchronously deploy preconfigured fleet server policies that are out of sync', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'fleet-server-policy',
          revision: 2,
          is_default_fleet_server: true,
          is_preconfigured: true,
        },
        { id: 'policy1', revision: 1 },
      ],
    } as any);

    // fleet-server-policy is out of sync; policy1 is up to date
    mockedAgentPolicyService.getLatestFleetPolicy.mockImplementation(async (_, agentPolicyId) => {
      if (agentPolicyId === 'fleet-server-policy') {
        return { revision_idx: 1 } as any;
      }
      if (agentPolicyId === 'policy1') {
        return { revision_idx: 1 } as any;
      }
      return null;
    });

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(
      expect.anything(),
      ['fleet-server-policy'],
      undefined,
      { throwOnAnyError: true }
    );
    expect(scheduleDeployAgentPoliciesTask).not.toBeCalled();
  });

  it('should synchronously deploy preconfigured fleet server policies and schedule regular outdated policies async', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'fleet-server-policy',
          revision: 2,
          is_default_fleet_server: true,
          is_preconfigured: true,
        },
        { id: 'policy1', revision: 3 },
      ],
    } as any);

    // Both are out of sync
    mockedAgentPolicyService.getLatestFleetPolicy.mockResolvedValue({ revision_idx: 1 } as any);

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(
      expect.anything(),
      ['fleet-server-policy'],
      undefined,
      { throwOnAnyError: true }
    );
    expect(scheduleDeployAgentPoliciesTask).toBeCalledWith(undefined, [
      { id: 'policy1', spaceId: undefined },
    ]);
  });

  it('should throw if preconfigured fleet server policy deploy fails due to ES bulk error', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'fleet-server-policy',
          revision: 2,
          is_default_fleet_server: true,
          is_preconfigured: true,
        },
      ],
    } as any);

    mockedAgentPolicyService.getLatestFleetPolicy.mockResolvedValue({ revision_idx: 1 } as any);
    mockedAgentPolicyService.deployPolicies.mockRejectedValue(
      new Error('ES bulk operation failed')
    );

    await expect(
      ensureAgentPoliciesFleetServerKeysAndPolicies({ logger, esClient, soClient })
    ).rejects.toThrow('ES bulk operation failed');
  });

  it('should synchronously deploy preconfigured fleet server policies identified by has_fleet_server flag', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        { id: 'custom-fs-policy', revision: 2, has_fleet_server: true, is_preconfigured: true },
      ],
    } as any);

    mockedAgentPolicyService.getLatestFleetPolicy.mockResolvedValue({ revision_idx: 1 } as any);

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    expect(mockedAgentPolicyService.deployPolicies).toBeCalledWith(
      expect.anything(),
      ['custom-fs-policy'],
      undefined,
      { throwOnAnyError: true }
    );
    expect(scheduleDeployAgentPoliciesTask).not.toBeCalled();
  });

  it('should not synchronously deploy non-preconfigured fleet server policies', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedAgentPolicyService.list.mockResolvedValue({
      items: [
        {
          id: 'user-fs-policy',
          revision: 2,
          is_default_fleet_server: true,
          is_preconfigured: false,
        },
      ],
    } as any);

    mockedAgentPolicyService.getLatestFleetPolicy.mockResolvedValue({ revision_idx: 1 } as any);

    await ensureAgentPoliciesFleetServerKeysAndPolicies({
      logger,
      esClient,
      soClient,
    });

    // Non-preconfigured fleet server policy goes to the async task, not synchronous deploy
    expect(mockedAgentPolicyService.deployPolicies).not.toBeCalled();
    expect(scheduleDeployAgentPoliciesTask).toBeCalledWith(undefined, [
      { id: 'user-fs-policy', spaceId: undefined },
    ]);
  });
});
