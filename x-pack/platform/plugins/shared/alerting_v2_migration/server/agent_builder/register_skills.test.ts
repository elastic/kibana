/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID } from '@kbn/alerting-v2-constants';
import { registerSkills } from './register_skills';

describe('registerSkills', () => {
  const createDeps = () => ({
    logger: loggingSystemMock.createLogger(),
    getClassicRulesClient: jest.fn(),
    isMigratable: jest.fn(),
    availability: {
      cacheMode: 'none' as const,
      handler: async () => ({ status: 'available' as const }),
    },
  });

  it('registers the classic-to-universal rule migration skill', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSkills(agentBuilder, createDeps());

    expect(agentBuilder.skills.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: CLASSIC_TO_UNIVERSAL_RULE_MIGRATION_SKILL_ID })
    );
  });

  it('logs instead of throwing when registration fails', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    agentBuilder.skills.register.mockImplementation(() => {
      throw new Error('not allowed');
    });
    const deps = createDeps();

    expect(() => registerSkills(agentBuilder, deps)).not.toThrow();
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('not allowed'),
      expect.objectContaining({
        labels: expect.objectContaining({ code: 'AGENT_BUILDER_SKILL_REGISTER_FAILED' }),
      })
    );
  });
});
