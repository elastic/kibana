/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import * as AgentService from '../agents';

import { reassignAgentsToVersionSpecificPolicies } from './reassign_agents_to_version_specific_policies_task';

vi.mock('../agents');
vi.mock('../app_context', () => {
      const mocked = {
      appContextService: {
        getLogger: vi.fn().mockReturnValue({
          debug: vi.fn(),
        }),
        getInternalUserESClient: vi.fn(),
        getInternalUserSOClientWithoutSpaceExtension: vi.fn(),
      },
    };
      return { ...mocked, default: mocked };
    });

describe('ReassignAgentsToVersionSpecificPoliciesTask', () => {
  it('should do nothing if there are no agents to reassign', async () => {
    vi.mocked(AgentService.getAgentsByKuery).mockResolvedValueOnce({
      total: 0,
      agents: [],
      page: 1,
      perPage: 20,
    });
    await reassignAgentsToVersionSpecificPolicies('policy-with-no-agents#8.19');
    expect(AgentService.reassignAgents).not.toHaveBeenCalled();
  });

  it('should reassign agents if found with query', async () => {
    vi.mocked(AgentService.getAgentsByKuery).mockResolvedValueOnce({
      total: 1,
      agents: [],
      page: 1,
      perPage: 20,
    });
    await reassignAgentsToVersionSpecificPolicies('policy-with-agents#9.3');
    expect(AgentService.reassignAgents).toHaveBeenCalledWith(
      undefined,
      undefined,
      {
        kuery:
          '(policy_id:"policy-with-agents" AND agent.version:9.3.*) OR (policy_id:policy-with-agents* AND agent.version:9.3.* AND upgraded_at:*)',
        showInactive: false,
        spaceId: '*',
        _internalCrossSpace: true,
      },
      'policy-with-agents#9.3'
    );
  });
});
