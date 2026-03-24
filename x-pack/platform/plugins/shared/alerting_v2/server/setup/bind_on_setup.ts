/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AlertingServerSetupDependencies } from '../types';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { TaskDefinition } from '../lib/services/task_run_scope_service/create_task_runner';
import { registerSavedObjects } from '../saved_objects';
import { registerTools } from '../agent_builder/tools';
import { registerSkills } from '../agent_builder/skills';
import { createScopedServicesFactory } from '../agent_builder/scoped_services';
import { createDataSourceDescriptionType } from '../agent_builder/attachment_types/data_source_description';
import { createRuleType } from '../agent_builder/attachment_types/rule';
import { createNotificationPolicyType } from '../agent_builder/attachment_types/notification_policy';

export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    const logger = container.get(Logger);

    registerFeaturePrivileges(container.get(PluginSetup('features')));

    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      encryptedSavedObjects: container.get(
        PluginSetup<AlertingServerSetupDependencies['encryptedSavedObjects']>(
          'encryptedSavedObjects'
        )
      ),
      logger,
    });

    container.get(CoreSetup('capabilities')).registerProvider(() => ({
      alertingVTwo: {},
    }));

    // Trigger task registration via onActivation callbacks
    container.getAll(TaskDefinition);

    // Register Agent Builder tools and skills when the plugin is available
    if (container.isBound(PluginSetup<AgentBuilderPluginSetup>('agentBuilder'))) {
      const agentBuilder = container.get(PluginSetup<AgentBuilderPluginSetup>('agentBuilder'));
      const coreSetup = container.get(CoreSetup('getStartServices'));
      const getScopedServices = createScopedServicesFactory(coreSetup);

      const workflowsManagement = container.get(
        PluginSetup<WorkflowsServerPluginSetup>('workflowsManagement')
      );

      agentBuilder.attachments.registerType(createDataSourceDescriptionType() as any);
      agentBuilder.attachments.registerType(createRuleType() as any);
      agentBuilder.attachments.registerType(createNotificationPolicyType() as any);
      registerTools({
        agentBuilder,
        getScopedServices,
        workflowsApi: workflowsManagement.management,
      });
      registerSkills(agentBuilder);
    }
  });
}
