/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureCorrectAgentlessSettingsIds } from './agentless_settings_ids';
import { agentPolicyService } from './agent_policy';

jest.mock('.', () => ({
  appContextService: {
    getLogger: () => ({
      debug: jest.fn(),
    }),
    getCloud: () => ({
      isCloudEnabled: true,
      isServerlessEnabled: true,
    }),
    getInternalUserSOClientWithoutSpaceExtension: () => ({
      find: jest.fn().mockImplementation(() => {
        return {
          saved_objects: [{ id: 'agent_policy_1' }, { id: 'agent_policy_2' }],
        };
      }),
    }),
  },
}));

jest.mock('./agents/agentless_agent', () => ({
  agentlessAgentService: {
    getDefaultSettings: jest.fn().mockReturnValue({
      outputId: 'es-default-output',
      fleetServerId: 'default-fleet-server',
    }),
  },
}));

jest.mock('./agent_policy', () => ({
  agentPolicyService: {
    find: jest.fn(),
    update: jest.fn(),
  },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('ingest-agent-policies'),
}));

jest.mock('./output', () => ({
  outputService: {
    get: jest.fn().mockResolvedValue({
      id: 'es-default-output',
    }),
  },
}));

jest.mock('./fleet_server_host', () => ({
  fleetServerHostService: {
    get: jest.fn().mockResolvedValue({
      id: 'default-fleet-server',
    }),
  },
}));

describe('correct agentless policy settings', () => {
  it('should correct agentless policy settings', async () => {
    await ensureCorrectAgentlessSettingsIds(undefined as any);

    expect(agentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'agent_policy_1',
      {
        data_output_id: 'es-default-output',
        fleet_server_host_id: 'default-fleet-server',
      },
      {
        force: true,
      }
    );
    expect(agentPolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'agent_policy_2',
      {
        data_output_id: 'es-default-output',
        fleet_server_host_id: 'default-fleet-server',
      },
      {
        force: true,
      }
    );
  });
});
