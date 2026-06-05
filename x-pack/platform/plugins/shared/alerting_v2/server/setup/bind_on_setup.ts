/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart, PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { ContainerModuleLoadOptions } from 'inversify';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';
import type { PluginConfig } from '../config';
import { registerTelemetryTask } from '../lib/usage/task_definition';
import { registerAlertingV2UsageCollector } from '../lib/usage/usage_collector';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { TaskDefinition } from '../lib/services/task_run_scope_service/create_task_runner';
import { registerSavedObjects } from '../saved_objects';
import { ALERTING_V2_EXPERIMENTAL_FEATURES_SETTING_ID } from '../../common/advanced_settings';
import { alertingV2UiSettings } from '../ui_settings/advanced_settings';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { createRuleAttachmentType } from '../agent_builder/attachments/rule_attachment_type';
import { createActionPolicyAttachmentType } from '../agent_builder/attachments/action_policy_attachment_type';
import { buildScopedRulesClientFactory } from '../agent_builder/scoped_rules_client_factory';
import { buildScopedActionPolicyClientFactory } from '../agent_builder/scoped_action_policy_client_factory';
import { createRuleSmlType } from '../agent_builder/sml/rule_sml_type';
import { createActionPolicySmlType } from '../agent_builder/sml/action_policy_sml_type';
import { registerSkills } from '../agent_builder/skills/register_skills';
import { RULE_SAVED_OBJECT_TYPE, ACTION_POLICY_SAVED_OBJECT_TYPE } from '../saved_objects';
import { WorkflowsManagementApiToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import { EventLoggerToken } from '../lib/services/event_log_service/tokens';
import { registerStepDefinitions } from '../lib/workflow_extensions/register_step_definitions';
import { registerTriggerDefinitions } from '../lib/workflow_extensions/register_trigger_definitions';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../lib/dispatcher/steps/constants';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);
    const taskManager = container.get(
      PluginSetup<AlertingServerSetupDependencies['taskManager']>('taskManager')
    );
    const usageCollectionToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['usageCollection']>>(
        'usageCollection'
      );

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    const config = container
      .get<PluginInitializerContext<PluginConfig>['config']>(PluginInitializer('config'))
      .get<PluginConfig>();

    // Adding the config check bc alertingV2 SOs are WIP
    if (config.enabled) {
      registerSavedObjects({
        savedObjects: container.get(CoreSetup('savedObjects')),
        encryptedSavedObjects: container.get(
          PluginSetup<AlertingServerSetupDependencies['encryptedSavedObjects']>(
            'encryptedSavedObjects'
          )
        ),
        logger,
      });
    }

    container.get(CoreSetup('capabilities')).registerProvider(() => ({
      alertingVTwo: {},
    }));

    const uiSettingsSetup = container.get(CoreSetup('uiSettings'));

    uiSettingsSetup.registerGlobal(alertingV2UiSettings);

    const eventLogService = container.get(
      PluginSetup<AlertingServerSetupDependencies['eventLog']>('eventLog')
    );
    eventLogService.registerProviderActions(
      ACTION_POLICY_EVENT_PROVIDER,
      Object.values(ACTION_POLICY_EVENT_ACTIONS)
    );
    const eventLogger = eventLogService.getLogger({
      event: { provider: ACTION_POLICY_EVENT_PROVIDER },
    });
    container.bind(EventLoggerToken).toConstantValue(eventLogger);

    const workflowsExtensionsSetup = container.get(
      PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions')
    );
    registerTriggerDefinitions(workflowsExtensionsSetup);
    registerStepDefinitions(workflowsExtensionsSetup);

    // Trigger task registration via onActivation callbacks
    container.getAll(TaskDefinition);

    const agentBuilderToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentBuilder']>>('agentBuilder');
    const agentContextLayerToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentContextLayer']>>(
        'agentContextLayer'
      );
    if (container.isBound(agentBuilderToken)) {
      const agentBuilder = container.get(agentBuilderToken);
      const getInjection = () => container.get(CoreStart('injection'));
      const getScopedRulesClient = buildScopedRulesClientFactory(getInjection);
      const getScopedActionPolicyClient = buildScopedActionPolicyClientFactory(getInjection);

      // SML types must be registered synchronously so the agent context layer
      // can schedule their crawler tasks during its own start phase. The
      // crawler itself gates on `agentContextLayer:experimentalFeatures`.
      if (container.isBound(agentContextLayerToken)) {
        const agentContextLayer = container.get(agentContextLayerToken);
        const getInternalRuleRepository = () =>
          container
            .get(CoreStart('savedObjects'))
            .createInternalRepository([RULE_SAVED_OBJECT_TYPE]);
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
    }

    if (container.isBound(usageCollectionToken)) {
      // Both getters are called task run (after start), so the
      // start-only bindings (esClient and taskManagerStart) exist by then.
      const getTaskManagerStart = () =>
        container.get(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'));
      const usageCollection = container.get(usageCollectionToken);
      const getEsClient = () => container.get(EsServiceInternalToken);

      registerAlertingV2UsageCollector(getTaskManagerStart, usageCollection);
      registerTelemetryTask(logger, taskManager, getEsClient);
    }
  });
}
