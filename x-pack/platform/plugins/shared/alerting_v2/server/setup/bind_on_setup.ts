/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';
import { registerTelemetryTask } from '../lib/usage/task_definition';
import { registerAlertingV2UsageCollector } from '../lib/usage/usage_collector';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { TaskDefinition } from '../lib/services/task_run_scope_service/create_task_runner';
import { registerSavedObjects } from '../saved_objects';
import { dispatcherUiSettings } from '../lib/dispatcher/ui_settings';
import { experimentalFeaturesUiSettings } from '../ui_settings/experimental_features_setting';
import { EsServiceInternalToken } from '../lib/services/es_service/tokens';
import { registerProposedChangeAttachmentType } from '../agent_builder/proposed_change_attachment';
import { registerAlertingV2Tools } from '../agent_builder/register_tools';
import { validateRulesStepDefinition } from '../step_types/validate_rules';
import { persistFindingsStepDefinition } from '../step_types/persist_findings';
import { createDiscoverFeaturesStepDefinition } from '../step_types/discover_features';

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

    container
      .get(CoreSetup('uiSettings'))
      .registerGlobal({ ...dispatcherUiSettings, ...experimentalFeaturesUiSettings });

    // Trigger task registration via onActivation callbacks
    container.getAll(TaskDefinition);

    const agentBuilderToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['agentBuilder']>>('agentBuilder');
    if (container.isBound(agentBuilderToken)) {
      const agentBuilder = container.get(agentBuilderToken);
      registerProposedChangeAttachmentType(agentBuilder);
      registerAlertingV2Tools(agentBuilder, container, logger);
    }

    const workflowsExtensions = container.get(
      PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions')
    );
    workflowsExtensions.registerStepDefinition(validateRulesStepDefinition);
    workflowsExtensions.registerStepDefinition(persistFindingsStepDefinition);

    const discoverFeaturesStep = createDiscoverFeaturesStepDefinition({
      getScopedSoClient: (fakeRequest) => {
        const savedObjects = container.get(CoreStart('savedObjects'));
        return savedObjects.getScopedClient(fakeRequest);
      },
      getInferenceClient: (fakeRequest) => {
        const inferenceToken =
          PluginStart<NonNullable<AlertingServerStartDependencies['inference']>>('inference');
        if (!container.isBound(inferenceToken)) return undefined;
        const inference = container.get(inferenceToken);
        return inference.getClient({ request: fakeRequest });
      },
      getDefaultConnectorId: async (fakeRequest) => {
        const inferenceToken =
          PluginStart<NonNullable<AlertingServerStartDependencies['inference']>>('inference');
        if (!container.isBound(inferenceToken)) return undefined;
        try {
          const inference = container.get(inferenceToken);
          const connector = await inference.getDefaultConnector(fakeRequest);
          return connector.connectorId;
        } catch {
          return undefined;
        }
      },
    });
    workflowsExtensions.registerStepDefinition(discoverFeaturesStep);

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
