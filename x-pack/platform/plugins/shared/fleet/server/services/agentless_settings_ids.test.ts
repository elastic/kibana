/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureCorrectAgentlessSettingsIds } from './agentless_settings_ids';
import { agentPolicyService } from './agent_policy';
import { agentlessAgentService } from './agents/agentless_agent';
import { packagePolicyService } from './package_policy';
import { outputService } from './output';
import { fleetServerHostService } from './fleet_server_host';

jest.mock('.', () => ({
  appContextService: {
    getLogger: () => ({
      debug: jest.fn(),
    }),
    getInternalUserSOClientWithoutSpaceExtension: () => ({}),
  },
}));

jest.mock('./agents/agentless_agent', () => ({
  agentlessAgentService: {
    getDefaultFleetServerId: jest.fn(),
    getDefaultOutputId: jest.fn(),
  },
}));

jest.mock('./agent_policy', () => ({
  agentPolicyService: {
    fetchAllAgentPolicies: jest.fn(),
    update: jest.fn(),
  },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('ingest-agent-policies'),
}));

jest.mock('./package_policy', () => ({
  packagePolicyService: {
    findAllForAgentPolicy: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('./output', () => ({
  outputService: {
    get: jest.fn().mockResolvedValue({ id: 'es-default-output' }),
  },
}));

jest.mock('./fleet_server_host', () => ({
  fleetServerHostService: {
    get: jest.fn().mockResolvedValue({ id: 'default-fleet-server' }),
  },
}));

const mockedAgentlessAgentService = agentlessAgentService as jest.Mocked<
  typeof agentlessAgentService
>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedOutputService = outputService as jest.Mocked<typeof outputService>;
const mockedFleetServerHostService = fleetServerHostService as jest.Mocked<
  typeof fleetServerHostService
>;

async function* pages(...items: any[][]) {
  for (const page of items) {
    yield page;
  }
}

describe('ensureCorrectAgentlessSettingsIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAgentlessAgentService.getDefaultFleetServerId.mockReturnValue('default-fleet-server');
    mockedOutputService.get.mockResolvedValue({ id: 'es-default-output' } as any);
    mockedFleetServerHostService.get.mockResolvedValue({ id: 'default-fleet-server' } as any);
    mockedPackagePolicyService.findAllForAgentPolicy.mockResolvedValue([]);
  });

  it('should do nothing when self-managed (no fleet server id)', async () => {
    mockedAgentlessAgentService.getDefaultFleetServerId.mockReturnValue(undefined);

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.fetchAllAgentPolicies).not.toHaveBeenCalled();
    expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
  });

  it('should fix the output and fleet server ids for policies that do not match', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'agent_policy_1',
          data_output_id: 'wrong-output',
          monitoring_output_id: 'wrong-output',
          fleet_server_host_id: 'wrong-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('es-default-output');

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'agent_policy_1',
      {
        data_output_id: 'es-default-output',
        monitoring_output_id: 'es-default-output',
        fleet_server_host_id: 'default-fleet-server',
      },
      { force: true }
    );
  });

  it('should not update a policy that already has the correct output and fleet server ids', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'agent_policy_1',
          data_output_id: 'es-default-output',
          monitoring_output_id: 'es-default-output',
          fleet_server_host_id: 'default-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('es-default-output');

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
  });

  it('should only fix the field that is actually wrong', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'agent_policy_1',
          data_output_id: 'es-default-output',
          monitoring_output_id: 'es-default-output',
          fleet_server_host_id: 'wrong-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('es-default-output');

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'agent_policy_1',
      { fleet_server_host_id: 'default-fleet-server' },
      { force: true }
    );
  });

  it('should assign different outputs to different policies based on their eligibility', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'bulk_eligible_policy',
          data_output_id: 'wrong-output',
          monitoring_output_id: 'wrong-output',
          fleet_server_host_id: 'default-fleet-server',
        },
        {
          id: 'connector_policy',
          data_output_id: 'wrong-output',
          monitoring_output_id: 'wrong-output',
          fleet_server_host_id: 'default-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockImplementation(
      (agentPolicy) =>
        (agentPolicy.package_policies?.[0]?.package?.name === 'elastic_connectors'
          ? 'es-agentless-output'
          : 'es-managed-bulk-agentless-output') as any
    );
    mockedPackagePolicyService.findAllForAgentPolicy.mockImplementation(async (_soClient, id) =>
      id === 'connector_policy'
        ? ([{ package: { name: 'elastic_connectors' } }] as any)
        : ([{ package: { name: 'nginx' } }] as any)
    );

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'bulk_eligible_policy',
      {
        data_output_id: 'es-managed-bulk-agentless-output',
        monitoring_output_id: 'es-managed-bulk-agentless-output',
      },
      { force: true }
    );
    expect(mockedAgentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'connector_policy',
      {
        data_output_id: 'es-agentless-output',
        monitoring_output_id: 'es-agentless-output',
      },
      { force: true }
    );
  });

  it('should not fix the output when the correct output does not exist', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'agent_policy_1',
          data_output_id: 'wrong-output',
          monitoring_output_id: 'wrong-output',
          fleet_server_host_id: 'default-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('nonexistent-output');
    mockedOutputService.get.mockResolvedValue(null as any);

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
  });

  it('should not fix the fleet server id when the correct fleet server host does not exist', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages([
        {
          id: 'agent_policy_1',
          data_output_id: 'es-default-output',
          monitoring_output_id: 'es-default-output',
          fleet_server_host_id: 'wrong-fleet-server',
        },
      ])
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('es-default-output');
    mockedFleetServerHostService.get.mockResolvedValue(null as any);

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).not.toHaveBeenCalled();
  });

  it('should process multiple pages', async () => {
    mockedAgentPolicyService.fetchAllAgentPolicies.mockResolvedValue(
      pages(
        [
          {
            id: 'agent_policy_1',
            data_output_id: 'wrong-output',
            monitoring_output_id: 'wrong-output',
            fleet_server_host_id: 'default-fleet-server',
          },
        ],
        [
          {
            id: 'agent_policy_2',
            data_output_id: 'wrong-output',
            monitoring_output_id: 'wrong-output',
            fleet_server_host_id: 'default-fleet-server',
          },
        ]
      )
    );
    mockedAgentlessAgentService.getDefaultOutputId.mockReturnValue('es-default-output');

    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(mockedAgentPolicyService.update).toHaveBeenCalledTimes(2);
  });
});
