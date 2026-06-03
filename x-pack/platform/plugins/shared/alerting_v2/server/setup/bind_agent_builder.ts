/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '../../common/advanced_settings';
import { createActionPolicyAttachmentType } from '../agent_builder/attachments/action_policy_attachment_type';
import { createRuleAttachmentType } from '../agent_builder/attachments/rule_attachment_type';
import { buildScopedActionPolicyClientFactory } from '../agent_builder/scoped_action_policy_client_factory';
import { buildScopedRulesClientFactory } from '../agent_builder/scoped_rules_client_factory';
import { registerSkills } from '../agent_builder/skills/register_skills';
import { createActionPolicySmlType } from '../agent_builder/sml/action_policy_sml_type';
import { createRuleSmlType } from '../agent_builder/sml/rule_sml_type';
import { WorkflowsManagementApiToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { AlertingServerSetupDependencies } from '../types';

/**
 * Setup-phase wiring for the Agent Builder integration (SML types, attachment
 * types, and skills).
 *
 * No-op when the optional `agentBuilder` plugin is not available. SML types are
 * also gated on the optional `agentContextLayer` plugin, and the attachments and
 * skills are gated on the experimental features advanced setting.
 */
export function bindAgentBuilder({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const agentBuilderToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentBuilder']>>('agentBuilder');
    if (!container.isBound(agentBuilderToken)) {
      return;
    }

    const logger = container.get(Logger);
    const agentBuilder = container.get(agentBuilderToken);
    const getInjection = () => container.get(CoreStart('injection'));
    const getScopedRulesClient = buildScopedRulesClientFactory(getInjection);
    const getScopedActionPolicyClient = buildScopedActionPolicyClientFactory(getInjection);

    // SML types must be registered synchronously so the agent context layer
    // can schedule their crawler tasks during its own start phase. The
    // crawler itself gates on `agentContextLayer:experimentalFeatures`.
    const agentContextLayerToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentContextLayer']>>(
        'agentContextLayer'
      );
    if (container.isBound(agentContextLayerToken)) {
      const agentContextLayer = container.get(agentContextLayerToken);
      const getInternalRuleRepository = () =>
        container.get(CoreStart('savedObjects')).createInternalRepository([RULE_SAVED_OBJECT_TYPE]);
      const getInternalActionPolicyRepository = () =>
        container
          .get(CoreStart('savedObjects'))
          .createInternalRepository([ACTION_POLICY_SAVED_OBJECT_TYPE]);
      agentContextLayer.registerType(
        createRuleSmlType({
          getScopedRulesClient,
          getInternalRepository: getInternalRuleRepository,
        })
      );
      agentContextLayer.registerType(
        createActionPolicySmlType({
          getScopedActionPolicyClient,
          getInternalRepository: getInternalActionPolicyRepository,
        })
      );
    }

    const getStartServices = container.get(CoreSetup('getStartServices'));
    getStartServices()
      .then(([coreStart]) => {
        const soClient = coreStart.savedObjects.createInternalRepository();
        const uiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(soClient);
        return uiSettingsClient.get<boolean>(ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID);
      })
      .then((enabled) => {
        if (enabled) {
          agentBuilder.attachments.registerType(
            createRuleAttachmentType({
              logger,
              getRulesClient: (context) => getScopedRulesClient(context.request),
            }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
          );
          agentBuilder.attachments.registerType(
            createActionPolicyAttachmentType({
              logger,
              getActionPolicyClient: (context) => getScopedActionPolicyClient(context.request),
            }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
          );

          const workflowsManagementApi = container.get(WorkflowsManagementApiToken);
          registerSkills(agentBuilder, {
            getWorkflow: (id, sid) => workflowsManagementApi.getWorkflow(id, sid),
            getAvailableConnectors: (sid, req) =>
              workflowsManagementApi.getAvailableConnectors(sid, req),
          });

          logger.info(
            'Rule management skill and attachments registered (experimental features enabled)'
          );
        }
      })
      .catch((err) => {
        logger.warn(
          `Failed to read alerting V2 experimental features setting; rule management skill not registered: ${err}`
        );
      });
  });
}
