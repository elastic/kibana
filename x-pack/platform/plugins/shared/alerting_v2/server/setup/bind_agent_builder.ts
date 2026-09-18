/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { OnSetup, OnStart, PluginSetup } from '@kbn/core-di';
import { CoreStart } from '@kbn/core-di-server';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import type { Container, ContainerModuleLoadOptions } from 'inversify';
import { createActionPolicyAttachmentType } from '../agent_builder/attachments/action_policy_attachment_type';
import { createEpisodeAttachmentType } from '../agent_builder/attachments/episode_attachment_type';
import { createRuleAttachmentType } from '../agent_builder/attachments/rule_attachment_type';
import { resolveRequestScoped } from '../agent_builder/resolve_request_scoped';
import { registerSkills } from '../agent_builder/skills/register_skills';
import { createActionPolicySmlType } from '../agent_builder/sml/action_policy_sml_type';
import { createRuleSmlType } from '../agent_builder/sml/rule_sml_type';
import { AttachmentTypeToken } from '../agent_builder/tokens';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { WorkflowsManagementApiToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import { EpisodesClient } from '../lib/episodes_client';
import { PrivilegeChecker } from '../lib/services/privilege_checker/privilege_checker';
import { RulesClient } from '../lib/rules_client';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../lib/services/logger_service/logger_service';
import { SettingsServiceToken } from '../lib/services/settings_service/tokens';
import type { AlertingServerSetupDependencies } from '../types';

type AgentBuilderSetup = NonNullable<AlertingServerSetupDependencies['agentBuilder']>;

/**
 * Returns the Agent Builder setup contract, or `undefined` when the optional
 * `agentBuilder` plugin is not available.
 */
function getAgentBuilder(container: Container): AgentBuilderSetup | undefined {
  const token = PluginSetup<AgentBuilderSetup>('agentBuilder');
  return container.isBound(token) ? container.get(token) : undefined;
}

/**
 * Wiring for the Agent Builder integration. No-op when the optional
 * `agentBuilder` plugin is not available.
 *
 * - SML types are registered during setup (synchronously) so the agent context
 *   layer can schedule their crawler tasks during its own start phase. Gated on
 *   the optional `agentBuilderSml` plugin.
 * - Attachment types are bound to {@link AttachmentTypeToken} (deps resolved via
 *   DI) and registered during start. Skills are registered alongside them.
 *
 * Both resolve request-scoped clients on demand via {@link resolveRequestScoped},
 * since they run outside the HTTP route scope.
 */
export function bindAgentBuilder({ bind }: ContainerModuleLoadOptions) {
  bind(AttachmentTypeToken).toResolvedValue(
    (loggerService: LoggerServiceContract, injection) =>
      createRuleAttachmentType({
        logger: loggerService.forSubsystem('agentBuilder'),
        getRulesClient: (context) => resolveRequestScoped(injection, context.request, RulesClient),
      }) as AttachmentTypeDefinition,
    [LoggerServiceToken, CoreStart('injection')]
  );
  bind(AttachmentTypeToken).toResolvedValue(
    (loggerService: LoggerServiceContract, injection) =>
      createActionPolicyAttachmentType({
        logger: loggerService.forSubsystem('agentBuilder'),
        getActionPolicyClient: (context) =>
          resolveRequestScoped(injection, context.request, ActionPolicyClient),
      }) as AttachmentTypeDefinition,
    [LoggerServiceToken, CoreStart('injection')]
  );
  bind(AttachmentTypeToken).toResolvedValue(
    (loggerService: LoggerServiceContract, injection) =>
      createEpisodeAttachmentType({
        logger: loggerService.forSubsystem('agentBuilder'),
        getEpisodesClient: (context) =>
          resolveRequestScoped(injection, context.request, EpisodesClient),
        getRulesClient: (context) => resolveRequestScoped(injection, context.request, RulesClient),
        getPrivilegeChecker: (context) =>
          resolveRequestScoped(injection, context.request, PrivilegeChecker),
      }) as AttachmentTypeDefinition,
    [LoggerServiceToken, CoreStart('injection')]
  );

  bind(OnSetup).toConstantValue((container) => {
    if (!getAgentBuilder(container)) {
      return;
    }

    const agentBuilderSmlToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentBuilderSml']>>(
        'agentBuilderSml'
      );
    if (!container.isBound(agentBuilderSmlToken)) {
      return;
    }

    const agentBuilderSml = container.get(agentBuilderSmlToken);

    // Resolved lazily at crawl time (start phase) so the SML hooks reflect the
    // current value of the `alerting:v2:enabled` global advanced setting on
    // every crawl, rather than a value captured once at setup.
    const getIsAlertingV2Enabled = () =>
      container.get(SettingsServiceToken).get(ALERTING_V2_ENABLED_SETTING_ID);

    // SML types are registered inline (not via a token registry like attachments):
    // registration happens at setup, but their clients must be resolved lazily at
    // crawl time (start phase), so deps cannot be eagerly injected at bind time.
    agentBuilderSml.registerType(
      createRuleSmlType({
        getScopedRulesClient: (request) =>
          resolveRequestScoped(container.get(CoreStart('injection')), request, RulesClient),
        getIsAlertingV2Enabled,
      })
    );
    agentBuilderSml.registerType(
      createActionPolicySmlType({
        getScopedActionPolicyClient: (request) =>
          resolveRequestScoped(container.get(CoreStart('injection')), request, ActionPolicyClient),
        getIsAlertingV2Enabled,
      })
    );
  });

  bind(OnStart).toConstantValue((container) => {
    const agentBuilder = getAgentBuilder(container);
    if (!agentBuilder) {
      return;
    }

    for (const attachmentType of container.getAll(AttachmentTypeToken)) {
      agentBuilder.attachments.registerType(attachmentType);
    }

    const workflowsManagementApi = container.get(WorkflowsManagementApiToken);
    const agentBuilderLogger = container.get(LoggerServiceToken).forSubsystem('agentBuilder');
    registerSkills(agentBuilder, {
      logger: agentBuilderLogger,
      getWorkflow: (id, sid) => workflowsManagementApi.getWorkflow(id, sid),
      getAvailableConnectors: (sid, req) => workflowsManagementApi.getAvailableConnectors(sid, req),
    });
  });
}
