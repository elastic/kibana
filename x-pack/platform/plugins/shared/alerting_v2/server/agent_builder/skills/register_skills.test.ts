/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_AUTHORING_SKILL_ID,
  RULE_AUTHORING_SKILL_ID,
} from '@kbn/alerting-v2-constants';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import { createActionPolicyAuthoringSkill } from './action_policy_authoring_skill';
import { createRuleAuthoringSkill } from './rule_authoring_skill';
import { registerSkills } from './register_skills';

jest.mock('./rule_authoring_skill', () => ({
  createRuleAuthoringSkill: jest.fn(),
}));

jest.mock('./action_policy_authoring_skill', () => ({
  createActionPolicyAuthoringSkill: jest.fn(),
}));

const createRuleAuthoringSkillMock = createRuleAuthoringSkill as jest.MockedFunction<
  typeof createRuleAuthoringSkill
>;
const createActionPolicyAuthoringSkillMock =
  createActionPolicyAuthoringSkill as jest.MockedFunction<typeof createActionPolicyAuthoringSkill>;

const createLogger = (): jest.Mocked<
  Pick<LoggerServiceContract, 'debug' | 'info' | 'warn' | 'error' | 'forSubsystem'>
> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  forSubsystem: jest.fn(),
});

const ruleSkill = { id: RULE_AUTHORING_SKILL_ID } as ReturnType<typeof createRuleAuthoringSkill>;
const actionPolicySkill = { id: ACTION_POLICY_AUTHORING_SKILL_ID } as ReturnType<
  typeof createActionPolicyAuthoringSkill
>;

describe('registerSkills', () => {
  let agentBuilder: ReturnType<typeof agentBuilderMocks.createSetup>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    agentBuilder = agentBuilderMocks.createSetup();
    logger = createLogger();
    createRuleAuthoringSkillMock.mockReset();
    createActionPolicyAuthoringSkillMock.mockReset();
    createRuleAuthoringSkillMock.mockReturnValue(ruleSkill);
    createActionPolicyAuthoringSkillMock.mockReturnValue(actionPolicySkill);
  });

  const deps = () =>
    ({
      logger: logger as unknown as LoggerServiceContract,
      getWorkflowClient: jest.fn(() => ({ getWorkflow: jest.fn() })),
      getAvailableConnectors: jest.fn(),
      getRulesClient: jest.fn(),
      getActionPolicyClient: jest.fn(),
      getPrivilegeChecker: jest.fn(),
      availability: {
        cacheMode: 'none',
        handler: jest.fn().mockResolvedValue({ status: 'available' }),
      },
    } as const);

  it('registers both skills and logs success at debug', () => {
    registerSkills(agentBuilder, deps());

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(2);
    expect(agentBuilder.skills.register).toHaveBeenNthCalledWith(1, ruleSkill);
    expect(agentBuilder.skills.register).toHaveBeenNthCalledWith(2, actionPolicySkill);

    expect(logger.debug).toHaveBeenNthCalledWith(1, {
      message: expect.any(Function),
      labels: { skill_id: RULE_AUTHORING_SKILL_ID },
    });
    expect(logger.debug).toHaveBeenNthCalledWith(2, {
      message: expect.any(Function),
      labels: { skill_id: ACTION_POLICY_AUTHORING_SKILL_ID },
    });
    const debugMessages = (logger.debug as jest.Mock).mock.calls.map(
      ([{ message }]) => (typeof message === 'function' ? message() : message) as string
    );
    expect(debugMessages).toEqual([
      `${RULE_AUTHORING_SKILL_ID} agent builder skill registered`,
      `${ACTION_POLICY_AUTHORING_SKILL_ID} agent builder skill registered`,
      'Agent builder skills and attachments registered',
    ]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs unexpected register failures at error with skill_id and continues', () => {
    agentBuilder.skills.register.mockImplementation((skill) => {
      if (skill.id === ACTION_POLICY_AUTHORING_SKILL_ID) {
        throw new Error('register boom');
      }
    });

    registerSkills(agentBuilder, deps());

    expect(agentBuilder.skills.register).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith({
      message: `Failed to register agent builder skill. Id: ${ACTION_POLICY_AUTHORING_SKILL_ID}`,
      code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
      labels: { skill_id: ACTION_POLICY_AUTHORING_SKILL_ID },
      error: expect.any(Error),
    });

    const debugMessages = (logger.debug as jest.Mock).mock.calls.map(
      ([{ message }]) => (typeof message === 'function' ? message() : message) as string
    );
    expect(debugMessages).toEqual([
      `${RULE_AUTHORING_SKILL_ID} agent builder skill registered`,
      'Agent builder skills partially registered',
    ]);
    expect(logger.debug).toHaveBeenCalledWith({
      message: expect.any(Function),
      labels: { skill_id: RULE_AUTHORING_SKILL_ID },
    });
  });

  it('does not log success debug when every skill fails', () => {
    createRuleAuthoringSkillMock.mockImplementation(() => {
      throw new Error('rule failed');
    });
    createActionPolicyAuthoringSkillMock.mockImplementation(() => {
      throw new Error('policy failed');
    });

    registerSkills(agentBuilder, deps());

    expect(agentBuilder.skills.register).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
        labels: { skill_id: RULE_AUTHORING_SKILL_ID },
      })
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ALERTING_LOG_CODES.AGENT_BUILDER_SKILL_REGISTER_FAILED,
        labels: { skill_id: ACTION_POLICY_AUTHORING_SKILL_ID },
      })
    );
    expect(logger.debug).not.toHaveBeenCalled();
  });
});
