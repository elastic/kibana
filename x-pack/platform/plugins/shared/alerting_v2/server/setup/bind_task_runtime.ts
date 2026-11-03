/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup, OnStart, PluginSetup } from '@kbn/core-di';
import { CoreSetup, CoreStart } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core/server';
import { resolveRequestScoped } from '../agent_builder/resolve_request_scoped';
import { AlertEventsClient } from '../lib/alert_events_client';
import { PrivilegeChecker } from '../lib/services/privilege_checker/privilege_checker';
import { registerCreateAlertEventStep } from '../lib/workflow_extensions/register_create_alert_event_step';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { ALERT_EVENTS_RESOURCE_KEY } from '../resources/datastreams/alert_events';
import { registerSavedObjects } from '../saved_objects';
import { EventLoggerToken } from '../lib/services/event_log_service/tokens';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../lib/dispatcher/steps/constants';
import { initTaskSubscribers } from '../lib/events/init_subscribers';
import { registerTriggerDefinitions } from '../lib/workflow_extensions/register_trigger_definitions';
import type { AlertingServerSetupDependencies } from '../types';
import { bindArtifactTypes } from './bind_artifact_types';
import { bindContract } from './bind_contract';
import { bindDispatcherExecutionServices } from './bind_dispatcher_executor';
import { bindEvents } from './bind_events';
import { bindRuleExecutionServices } from './bind_rule_executor';
import { bindServices } from './bind_services';
import { bindTasks } from './bind_tasks';

/**
 * Setup-time registrations the task runtime depends on: the saved object types its tasks read and
 * write, and the event log provider the dispatcher logs to.
 */
function bindTaskRuntimeOnSetup({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    registerSavedObjects({
      savedObjects: container.get(CoreSetup('savedObjects')),
      encryptedSavedObjects: container.get(
        PluginSetup<AlertingServerSetupDependencies['encryptedSavedObjects']>(
          'encryptedSavedObjects'
        )
      ),
      logger: container.get(LoggerServiceToken).forSubsystem('savedObjects'),
    });

    // The triggers the task runtime emits events for: a pod validates them against its own registry.
    registerTriggerDefinitions(
      container.get(
        PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions')
      )
    );

    // The `create_alert_event` workflow step runs where the workflow does, so a workflows pod needs it.
    const getInjection = () => container.get(CoreStart('injection'));
    registerCreateAlertEventStep(
      container.get(
        PluginSetup<AlertingServerSetupDependencies['workflowsExtensions']>('workflowsExtensions')
      ),
      async (request: KibanaRequest) =>
        resolveRequestScoped(getInjection(), request, AlertEventsClient),
      (request: KibanaRequest) =>
        resolveRequestScoped(getInjection(), request, PrivilegeChecker).canWrite('alerts')
    );

    const eventLogService = container.get(
      PluginSetup<AlertingServerSetupDependencies['eventLog']>('eventLog')
    );
    eventLogService.registerProviderActions(
      ACTION_POLICY_EVENT_PROVIDER,
      Object.values(ACTION_POLICY_EVENT_ACTIONS)
    );
    container
      .bind(EventLoggerToken)
      .toConstantValue(
        eventLogService.getLogger({ event: { provider: ACTION_POLICY_EVENT_PROVIDER } })
      );
  });
}

/** Subscribers that react to events published while a task runs. */
function bindTaskRuntimeOnStart({ bind }: ContainerModuleLoadOptions) {
  bind(OnStart).toConstantValue((container) => {
    initTaskSubscribers(container);
  });
}

/**
 * Everything needed to run this plugin's tasks, and nothing that serves requests, schedules tasks
 * or registers with Kibana-only services. Kibana loads it as part of the plugin module and a task
 * pod loads it on its own (`server/tasks`), so a task runs the same code in both places.
 */
export function bindTaskRuntime(options: ContainerModuleLoadOptions) {
  bindServices(options);
  bindEvents(options);
  bindArtifactTypes(options);
  bindRuleExecutionServices(options);
  bindDispatcherExecutionServices(options);
  bindTasks(options);
  bindTaskRuntimeOnSetup(options);
  bindTaskRuntimeOnStart(options);
}

/**
 * In a pod nothing provisions resources: Kibana creates the alert events data stream. Marking it
 * provisioned lets the alert events client write to it without the pod ever creating anything.
 */
function bindPodProvisionedResources({ bind }: ContainerModuleLoadOptions) {
  bind(OnSetup).toConstantValue((container) => {
    container
      .get(ResourceManager)
      .registerResource(ALERT_EVENTS_RESOURCE_KEY, { initialize: async () => {} });
  });
}

export const taskRuntimeModule = new ContainerModule((options) => {
  bindTaskRuntime(options);
  bindPodProvisionedResources(options);
  // The contract (request-scoped rules and alert events clients) other plugins' task entries use;
  // in Kibana the plugin's `server` entry binds it.
  bindContract(options);
});
