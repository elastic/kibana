/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentService } from './agents_service';
import { createPublicAgentsContract } from './create_public_agents_contract';

const buildAgent = (skillIds?: string[]): AgentDefinition =>
  ({
    id: 'agent-1',
    configuration: { tools: [], skill_ids: skillIds },
  } as unknown as AgentDefinition);

describe('createPublicAgentsContract - addSkillToAgent', () => {
  it('appends the skill id to the existing skill_ids and updates the agent', async () => {
    const agentService = {
      get: jest.fn().mockResolvedValue(buildAgent(['a'])),
      update: jest.fn().mockResolvedValue(buildAgent(['a', 'b'])),
    } as unknown as AgentService;
    const contract = createPublicAgentsContract({ agentService });

    await contract.addSkillToAgent({ agentId: 'agent-1', skillId: 'b' });

    expect(agentService.get).toHaveBeenCalledWith('agent-1');
    expect(agentService.update).toHaveBeenCalledWith('agent-1', {
      configuration: { skill_ids: ['a', 'b'] },
    });
  });

  it('treats missing skill_ids as an empty list', async () => {
    const agentService = {
      get: jest.fn().mockResolvedValue(buildAgent(undefined)),
      update: jest.fn().mockResolvedValue(buildAgent(['b'])),
    } as unknown as AgentService;
    const contract = createPublicAgentsContract({ agentService });

    await contract.addSkillToAgent({ agentId: 'agent-1', skillId: 'b' });

    expect(agentService.update).toHaveBeenCalledWith('agent-1', {
      configuration: { skill_ids: ['b'] },
    });
  });

  it('is idempotent when the skill is already attached', async () => {
    const existing = buildAgent(['a', 'b']);
    const agentService = {
      get: jest.fn().mockResolvedValue(existing),
      update: jest.fn(),
    } as unknown as AgentService;
    const contract = createPublicAgentsContract({ agentService });

    const result = await contract.addSkillToAgent({ agentId: 'agent-1', skillId: 'b' });

    expect(agentService.update).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });
});
