/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup, PluginSetup, PluginStart, Start } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { resolveRequestScoped } from '../agent_builder/resolve_request_scoped';
import { PrivilegeChecker } from '../lib/services/privilege_checker/privilege_checker';
import type {
  AlertingServerSetupDependencies,
  AlertingServerStartDependencies,
  AlertingServerStart,
} from '../types';
import { registerFeaturePrivileges } from '../lib/security/privileges';
import { registerSavedObjects } from '../saved_objects';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { registerCreateAlertEventStep } from '../lib/workflow_extensions/register_create_alert_event_step';
import { registerCreateSignalEventStep } from '../lib/workflow_extensions/register_create_signal_event_step';
import { registerTriggerDefinitions } from '../lib/workflow_extensions/register_trigger_definitions';
import { registerAlertingV2ManagedWorkflowOwner } from '../lib/workflow_extensions/managed_workflows';
import { registerAlertingV2UsageCollector } from '../lib/usage/usage_collector';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../lib/services/event_log_service/constants';
import { registerAlertingAdvancedSettings } from '../settings/advanced_settings';
import { registerTelemetryEvents } from '../lib/telemetry/register_ebt_events';

/**
 * Core platform setup-phase registrations (feature privileges, saved objects,
 * capabilities, UI settings, the action policy event log, workflow extensions,
 * and usage collection).
 *
 * Larger / optional concerns live in their own setup modules: task definitions
 * in `bind_tasks` and Agent Builder in `bind_agent_builder`. `OnSetup` is a
 * multi-bound token, so each module contributes its own handler.
 */
export function bindOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toResolvedValue(
    (
        features,
        savedObjects,
        encryptedSavedObjects,
        loggerService,
        uiSettings,
        analytics,
        eventLog,
        workflowsExtensions
      ) =>
      (container) => {
        registerFeaturePrivileges(features);

        registerSavedObjects({
          savedObjects,
          encryptedSavedObjects,
          logger: loggerService.forSubsystem('savedObjects'),
        });

        registerAlertingAdvancedSettings(uiSettings);

        // Event types must be registered during setup, before the first `reportEvent`.
        registerTelemetryEvents(analytics);

        eventLog.registerProviderActions(
          ACTION_POLICY_EVENT_PROVIDER,
          Object.values(ACTION_POLICY_EVENT_ACTIONS)
        );

        registerAlertingV2ManagedWorkflowOwner(workflowsExtensions);
        registerTriggerDefinitions(workflowsExtensions);

        // These run at workflow-step execution time (after start), so they must
        // defer resolution of the start-stage services through the container.
        const getAlertEventsClient = (request: KibanaRequest) =>
          container
            .get(Start as ServiceToken<AlertingServerStart>)
            .getAlertEventsClientWithRequest(request);
        const checkAlertWritePrivilege = (request: KibanaRequest) =>
          resolveRequestScoped(
            container.get(CoreStart('injection')),
            request,
            PrivilegeChecker
          ).canWrite('alerts');
        registerCreateAlertEventStep(
          workflowsExtensions,
          getAlertEventsClient,
          checkAlertWritePrivilege
        );
        registerCreateSignalEventStep(
          workflowsExtensions,
          getAlertEventsClient,
          checkAlertWritePrivilege
        );

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
            container.get(
              PluginStart<AlertingServerStartDependencies['taskManager']>('taskManager')
            );

          registerAlertingV2UsageCollector(
            getTaskManagerStart,
            container.get(usageCollectionToken)
          );
        }
      },
    [
      PluginSetup<AlertingServerSetupDependencies['features']>('features'),
      CoreSetup('savedObjects'),
      PluginSetup<AlertingServerSetupDependencies['encryptedSavedObjects']>(
        'encryptedSavedObjects'
      ),
      LoggerServiceToken,
      CoreSetup('uiSettings'),
      CoreSetup('analytics'),
      PluginSetup<AlertingServerSetupDependencies['eventLog']>('eventLog'),
      PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions'),
    ]
  );
}
