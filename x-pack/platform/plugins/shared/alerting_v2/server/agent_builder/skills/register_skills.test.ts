/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import { createActionPolicyManagementSkill } from './action_policy_management_skill';
import { createRuleManagementSkill } from './rule_management_skill';
import { registerSkills } from './register_skills';

jest.mock('./rule_management_skill', () => ({
  createRuleManagementSkill: jest.fn(),
}));

jest.mock('./action_policy_management_skill', () => ({
  createActionPolicyManagementSkill: jest.fn(),
}));

const createRuleManagementSkillMock = createRuleManagementSkill as jest.MockedFunction<
  typeof createRuleManagementSkill
>;
const createActionPolicyManagementSkillMock =
  createActionPolicyManagementSkill as jest.MockedFunction<
    typeof createActionPolicyManagementSkill
  >;

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

const ruleSkill = { id: RULE_MANAGEMENT_SKILL_ID } as ReturnType<typeof createRuleManagementSkill>;
const actionPolicySkill = { id: ACTION_POLICY_MANAGEMENT_SKILL_ID } as ReturnType<
  typeof createActionPolicyManagementSkill
>;

describe('registerSkills', () => {
  let agentBuilder: ReturnType<typeof agentBuilderMocks.createSetup>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    agentBuilder = agentBuilderMocks.createSetup();
    logger = createLogger();
    createRuleManagementSkillMock.mockReset();
    createActionPolicyManagementSkillMock.mockReset();
    createRuleManagementSkillMock.mockReturnValue(ruleSkill);
    createActionPolicyManagementSkillMock.mockReturnValue(actionPolicySkill);
  });

  const deps = () =>
    ({
      logger: logger as unknown as LoggerServiceContract,
      getWorkflow: jest.fn(),
      getAvailableConnectors: jest.fn(),
    } as const);

  it('registers both skills and logs success at debug', () => {
    registerSkills(agentBuilder, deps());

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(2);
    expect(agentBuilder.skills.register).toHaveBeenNthCalledWith(1, ruleSkill);
    expect(agentBuilder.skills.register).toHaveBeenNthCalledWith(2, actionPolicySkill);

    expect(logger.debug).toHaveBeenCalledWith({
      message: expect.any(Function),
    });
    const debugMessage = (logger.debug as jest.Mock).mock.calls[0][0].message as () => string;
    expect(debugMessage()).toBe('Agent builder skills and attachments registered');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs register failures at error with skill_id and rethrows so Kibana start fails', () => {
    agentBuilder.skills.register.mockImplementation((skill) => {
      if (skill.id === ACTION_POLICY_MANAGEMENT_SKILL_ID) {
        throw new Error('register boom');
      }
    });

    expect(() => registerSkills(agentBuilder, deps())).toThrow('register boom');

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith({
      message: 'Failed to register agent builder skill',
      code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
      labels: { skill_id: ACTION_POLICY_MANAGEMENT_SKILL_ID },
      error: expect.any(Error),
    });
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('does not register later skills or log success after the first failure', () => {
    createRuleManagementSkillMock.mockImplementation(() => {
      throw new Error('rule failed');
    });
    createActionPolicyManagementSkillMock.mockImplementation(() => {
      throw new Error('policy failed');
    });

    expect(() => registerSkills(agentBuilder, deps())).toThrow('rule failed');

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
    expect(createActionPolicyManagementSkillMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
        labels: { skill_id: RULE_MANAGEMENT_SKILL_ID },
      })
    );
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
