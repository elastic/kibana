/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import { OnSetup, OnStart, PluginSetup } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { createActionPolicyAttachmentType } from '../agent_builder/attachments/action_policy_attachment_type';
import { createEpisodeAttachmentType } from '../agent_builder/attachments/episode_attachment_type';
import { createRuleAttachmentType } from '../agent_builder/attachments/rule_attachment_type';
import { registerSkills } from '../agent_builder/skills/register_skills';
import { createActionPolicySmlType } from '../agent_builder/sml/action_policy_sml_type';
import { createRuleSmlType } from '../agent_builder/sml/rule_sml_type';
import { WorkflowsManagementApiToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { createLoggerService } from '../lib/services/logger_service/logger_service.mock';
import { SettingsServiceToken } from '../lib/services/settings_service/tokens';
import type { AlertingServerSetupDependencies } from '../types';
import { bindAgentBuilder } from './bind_agent_builder';

jest.mock('../agent_builder/attachments/rule_attachment_type', () => ({
  createRuleAttachmentType: jest.fn(),
}));
jest.mock('../agent_builder/attachments/action_policy_attachment_type', () => ({
  createActionPolicyAttachmentType: jest.fn(),
}));
jest.mock('../agent_builder/attachments/episode_attachment_type', () => ({
  createEpisodeAttachmentType: jest.fn(),
}));
jest.mock('../agent_builder/sml/rule_sml_type', () => ({
  createRuleSmlType: jest.fn(),
}));
jest.mock('../agent_builder/sml/action_policy_sml_type', () => ({
  createActionPolicySmlType: jest.fn(),
}));
jest.mock('../agent_builder/skills/register_skills', () => ({
  registerSkills: jest.fn(),
}));

const createRuleAttachmentTypeMock = createRuleAttachmentType as jest.MockedFunction<
  typeof createRuleAttachmentType
>;
const createActionPolicyAttachmentTypeMock =
  createActionPolicyAttachmentType as jest.MockedFunction<typeof createActionPolicyAttachmentType>;
const createEpisodeAttachmentTypeMock = createEpisodeAttachmentType as jest.MockedFunction<
  typeof createEpisodeAttachmentType
>;
const createRuleSmlTypeMock = createRuleSmlType as jest.MockedFunction<typeof createRuleSmlType>;
const createActionPolicySmlTypeMock = createActionPolicySmlType as jest.MockedFunction<
  typeof createActionPolicySmlType
>;
const registerSkillsMock = registerSkills as jest.MockedFunction<typeof registerSkills>;

type AgentBuilderSetup = NonNullable<AlertingServerSetupDependencies['agentBuilder']>;
type AgentBuilderSmlSetup = NonNullable<AlertingServerSetupDependencies['agentBuilderSml']>;

const ruleAttachment = { id: 'rule-attachment' } as unknown as ReturnType<
  typeof createRuleAttachmentType
>;
const actionPolicyAttachment = { id: 'action-policy-attachment' } as unknown as ReturnType<
  typeof createActionPolicyAttachmentType
>;
const episodeAttachment = { id: 'episode-attachment' } as unknown as ReturnType<
  typeof createEpisodeAttachmentType
>;
const ruleSmlType = { id: 'rule-sml' };
const actionPolicySmlType = { id: 'action-policy-sml' };

describe('bindAgentBuilder', () => {
  let container: Container;
  let agentBuilder: ReturnType<typeof agentBuilderMocks.createSetup>;
  let agentBuilderSml: { registerType: jest.Mock };
  let settings: { get: jest.Mock };
  let workflowsManagementApi: { getWorkflow: jest.Mock; getAvailableConnectors: jest.Mock };
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];

  const runOnSetup = (): void => {
    container.get<(c: Container) => void>(OnSetup)(container);
  };

  const runOnStart = (): void => {
    return container.get<(c: Container) => void>(OnStart)(container);
  };

  beforeEach(() => {
    container = new Container();
    agentBuilder = agentBuilderMocks.createSetup();
    agentBuilderSml = { registerType: jest.fn() };
    settings = { get: jest.fn().mockResolvedValue(true) };
    workflowsManagementApi = {
      getWorkflow: jest.fn(),
      getAvailableConnectors: jest.fn(),
    };
    ({ loggerService } = createLoggerService());

    createRuleAttachmentTypeMock.mockReset();
    createActionPolicyAttachmentTypeMock.mockReset();
    createEpisodeAttachmentTypeMock.mockReset();
    createRuleSmlTypeMock.mockReset();
    createActionPolicySmlTypeMock.mockReset();
    registerSkillsMock.mockReset();

    createRuleAttachmentTypeMock.mockReturnValue(ruleAttachment);
    createActionPolicyAttachmentTypeMock.mockReturnValue(actionPolicyAttachment);
    createEpisodeAttachmentTypeMock.mockReturnValue(episodeAttachment);
    createRuleSmlTypeMock.mockReturnValue(ruleSmlType as ReturnType<typeof createRuleSmlType>);
    createActionPolicySmlTypeMock.mockReturnValue(
      actionPolicySmlType as ReturnType<typeof createActionPolicySmlType>
    );

    container.bind(CoreStart('injection')).toConstantValue({} as never);
    container.bind(LoggerServiceToken).toConstantValue(loggerService);
    container.bind(SettingsServiceToken).toConstantValue(settings as never);
    container.bind(WorkflowsManagementApiToken).toConstantValue(workflowsManagementApi as never);

    container.load(new ContainerModule((options) => bindAgentBuilder(options)));
  });

  const bindAgentBuilderPlugin = () => {
    container
      .bind(PluginSetup<AgentBuilderSetup>('agentBuilder'))
      .toConstantValue(agentBuilder as AgentBuilderSetup);
  };

  const bindAgentBuilderSmlPlugin = () => {
    container
      .bind(PluginSetup<AgentBuilderSmlSetup>('agentBuilderSml'))
      .toConstantValue(agentBuilderSml as unknown as AgentBuilderSmlSetup);
  };

  describe('OnSetup', () => {
    it('is a no-op when the optional agentBuilder plugin is not available', () => {
      bindAgentBuilderSmlPlugin();

      runOnSetup();

      expect(agentBuilderSml.registerType).not.toHaveBeenCalled();
      expect(createRuleSmlTypeMock).not.toHaveBeenCalled();
      expect(createActionPolicySmlTypeMock).not.toHaveBeenCalled();
    });

    it('is a no-op when agentBuilder is present but agentBuilderSml is not', () => {
      bindAgentBuilderPlugin();

      runOnSetup();

      expect(createRuleSmlTypeMock).not.toHaveBeenCalled();
      expect(createActionPolicySmlTypeMock).not.toHaveBeenCalled();
    });

    it('registers rule and action-policy SML types when both plugins are available', () => {
      bindAgentBuilderPlugin();
      bindAgentBuilderSmlPlugin();

      runOnSetup();

      expect(createRuleSmlTypeMock).toHaveBeenCalledTimes(1);
      expect(createActionPolicySmlTypeMock).toHaveBeenCalledTimes(1);
      expect(agentBuilderSml.registerType).toHaveBeenNthCalledWith(1, ruleSmlType);
      expect(agentBuilderSml.registerType).toHaveBeenNthCalledWith(2, actionPolicySmlType);
    });

    it('reads alerting:v2:enabled lazily at crawl time rather than capturing it at setup', async () => {
      bindAgentBuilderPlugin();
      bindAgentBuilderSmlPlugin();

      runOnSetup();

      const { getIsAlertingV2Enabled } = createRuleSmlTypeMock.mock.calls[0][0];
      expect(settings.get).not.toHaveBeenCalled();

      await expect(getIsAlertingV2Enabled()).resolves.toBe(true);
      expect(settings.get).toHaveBeenCalledWith(ALERTING_V2_ENABLED_SETTING_ID);
    });
  });

  describe('OnStart', () => {
    it('is a no-op when the optional agentBuilder plugin is not available', () => {
      runOnStart();

      expect(registerSkillsMock).not.toHaveBeenCalled();
      expect(agentBuilder.attachments.registerType).not.toHaveBeenCalled();
    });

    it('registers attachment types and skills synchronously', () => {
      bindAgentBuilderPlugin();

      const result = runOnStart();

      expect(result).toBeUndefined();
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledTimes(3);
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledWith(ruleAttachment);
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledWith(actionPolicyAttachment);
      expect(agentBuilder.attachments.registerType).toHaveBeenCalledWith(episodeAttachment);

      expect(registerSkillsMock).toHaveBeenCalledTimes(1);
      expect(registerSkillsMock).toHaveBeenCalledWith(
        agentBuilder,
        expect.objectContaining({
          logger: expect.anything(),
          getWorkflow: expect.any(Function),
          getAvailableConnectors: expect.any(Function),
        })
      );
    });

    it('wires skill workflow helpers to the workflows management API', async () => {
      bindAgentBuilderPlugin();
      runOnStart();

      const deps = registerSkillsMock.mock.calls[0][1];
      const request = {} as never;

      await deps.getWorkflow('workflow-1', 'space-1');
      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith('workflow-1', 'space-1');

      await deps.getAvailableConnectors('space-1', request);
      expect(workflowsManagementApi.getAvailableConnectors).toHaveBeenCalledWith(
        'space-1',
        request
      );
    });
  });
});
