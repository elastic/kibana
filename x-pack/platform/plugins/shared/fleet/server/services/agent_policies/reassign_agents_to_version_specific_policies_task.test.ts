/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as AgentService from '../agents';

import { reassignAgentsToVersionSpecificPolicies } from './reassign_agents_to_version_specific_policies_task';

jest.mock('../agents');
jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
    }),
    getInternalUserESClient: jest.fn(),
    getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
  },
}));

describe('ReassignAgentsToVersionSpecificPoliciesTask', () => {
  it('should do nothing if there are no agents to reassign', async () => {
    jest.mocked(AgentService.getAgentsByKuery).mockResolvedValueOnce({
      total: 0,
      agents: [],
      page: 1,
      perPage: 20,
    });
    await reassignAgentsToVersionSpecificPolicies('policy-with-no-agents#8.19');
    expect(AgentService.reassignAgents).not.toHaveBeenCalled();
  });

  it('should reassign agents if found with query', async () => {
    jest.mocked(AgentService.getAgentsByKuery).mockResolvedValueOnce({
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
      },
      'policy-with-agents#9.3'
    );
  });
});
