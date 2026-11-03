/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup, PluginSetup, PluginStart } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
import type { AlertingServerSetupDependencies, AlertingServerStartDependencies } from '../types';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { registerAlertingV2ManagedWorkflowOwner } from '../lib/workflow_extensions/managed_workflows';
import { registerAlertingV2UsageCollector } from '../lib/usage/usage_collector';
import { registerAlertingAdvancedSettings } from '../settings/advanced_settings';
import { registerTelemetryEvents } from '../lib/telemetry/register_ebt_events';

/**
 * Kibana-side setup-phase registrations (feature privileges, UI settings, telemetry events,
 * workflow extensions, and usage collection). What tasks need to run (saved objects, the action
 * policy event log) is in `bind_task_runtime`, which task pods load too.
 *
 * Larger / optional concerns live in their own setup modules: task definitions
 * in `bind_tasks` and Agent Builder in `bind_agent_builder`. `OnSetup` is a
 * multi-bound token, so each module contributes its own handler.
 */
export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    registerFeaturePrivileges(container.get(PluginSetup('features')));

    const uiSettingsSetup = container.get(CoreSetup('uiSettings'));

    registerAlertingAdvancedSettings(uiSettingsSetup);

    // Event types must be registered during setup, before the first `reportEvent`.
    const analyticsSetup = container.get(CoreSetup('analytics'));
    registerTelemetryEvents(analyticsSetup);

    const workflowsExtensionsSetup = container.get(
      PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions')
    );
    registerAlertingV2ManagedWorkflowOwner(workflowsExtensionsSetup);

    // Usage collection is optional. The telemetry task that feeds this collector
    // is registered unconditionally via the `TaskDefinition` registry in
    // `bind_tasks`.
    const usageCollectionToken =
      PluginSetup<NonNullable<AlertingServerSetupDependencies['usageCollection']>>(
        'usageCollection'
      );
    if (container.isBound(usageCollectionToken)) {
      // The getter is called at task run (after start), so the start-only
      // taskManager binding exists by then.
      const getTaskManagerStart = () =>
        container.get(PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager'));

      registerAlertingV2UsageCollector(getTaskManagerStart, container.get(usageCollectionToken));
    }
  });
}
