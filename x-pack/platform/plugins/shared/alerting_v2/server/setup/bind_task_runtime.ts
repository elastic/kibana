/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContainerModule } from 'inversify';
import type { ContainerModuleLoadOptions } from 'inversify';
import { OnSetup, OnStart, PluginSetup } from '@kbn/core-di';
import { CoreSetup } from '@kbn/core-di-server';
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

export const taskRuntimeModule = new ContainerModule((options) => bindTaskRuntime(options));
