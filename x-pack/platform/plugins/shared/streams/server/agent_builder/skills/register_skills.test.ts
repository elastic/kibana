/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import { registerAgentBuilderSkills } from './register_skills';

const mockAvailability: ToolAvailabilityConfig = {
  cacheMode: 'space',
  handler: jest.fn().mockResolvedValue({ status: 'available' }),
};

describe('registerAgentBuilderSkills', () => {
  it('attaches availability to every registered skill', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerAgentBuilderSkills({
      agentBuilder,
      availability: mockAvailability,
    });

    expect(agentBuilder.skills.register).toHaveBeenCalled();
    for (const [skill] of agentBuilder.skills.register.mock.calls) {
      expect(skill.availability).toBe(mockAvailability);
    }
  });

  it('does not register any skills when agentBuilder is falsy', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerAgentBuilderSkills({
      agentBuilder: undefined!,
      availability: mockAvailability,
    });

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
  });
});
