/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type {
  EncryptedSavedObjectsTasksSetup,
  EncryptedSavedObjectsTasksStart,
} from '@kbn/encrypted-saved-objects-plugin/server/tasks';
import type { EventLogTasksSetup } from '@kbn/event-log-plugin/server/tasks';
import type { LicensingTasksSetup, LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type {
  TaskManagerTasksSetup,
  TaskManagerTasksStart,
} from '@kbn/task-manager-plugin/server/tasks';
import { type ActionsConfig, configSchema, getValidatedConfig } from '../config';
import { resolveCustomHosts } from '../lib/custom_host_settings';
import { actionsBridge } from './bridge';
import {
  type ActionsExecuteRuntime,
  type ActionsTasksSetup,
  type ActionsTasksStart,
  createActionsExecuteRuntime,
} from './runtime';

export type { ActionsTasksSetup, ActionsTasksStart } from './runtime';

interface TasksSetupDeps {
  taskManager: TaskManagerTasksSetup;
  encryptedSavedObjects: EncryptedSavedObjectsTasksSetup;
  licensing: LicensingTasksSetup;
  eventLog: EventLogTasksSetup;
}

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  encryptedSavedObjects: EncryptedSavedObjectsTasksStart;
  licensing: LicensingTasksStart;
  spaces?: SpacesTasksStart;
}

/**
 * The connector execute path for task runtimes: connector types register here (through
 * `registerType`) and the executor and task runner factory run them. In Kibana the Actions plugin
 * builds the runtime and publishes it (`bridge.ts`); a task pod builds its own, without
 * authorization, so connector types that need Kibana privileges are not run there.
 */
class ActionsTasksPlugin
  implements TasksPlugin<ActionsTasksSetup, ActionsTasksStart, TasksSetupDeps, TasksStartDeps>
{
  private runtime?: ActionsExecuteRuntime;

  constructor(private readonly context: PluginInitializerContext<ActionsConfig>) {}

  setup(
    core: CoreTasksSetup<TasksStartDeps, ActionsTasksStart>,
    plugins: TasksSetupDeps
  ): ActionsTasksSetup {
    const real = actionsBridge.getSetup();
    if (real) return real;

    const logger = this.context.logger.get();
    const config = getValidatedConfig(
      logger,
      resolveCustomHosts(logger, this.context.config.get<ActionsConfig>())
    );
    this.runtime = createActionsExecuteRuntime({
      logger,
      config,
      core,
      taskManager: plugins.taskManager,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      licensing: plugins.licensing,
      eventLog: plugins.eventLog,
      getSystemIdentity: () => undefined,
      canRunPrivilegedActionTypes: false,
    });
    return this.runtime.setup;
  }

  start(core: CoreTasksStart, plugins: TasksStartDeps): ActionsTasksStart {
    const real = actionsBridge.getStart();
    if (real) return real;

    return this.runtime!.start({
      core,
      encryptedSavedObjects: plugins.encryptedSavedObjects,
      licensing: plugins.licensing,
      // The execute path only schedules through `bulkSchedule`.
      taskManager: plugins.taskManager as never,
      // It only reads the space of a request and converts space ids.
      spaces: plugins.spaces as never,
      getAuthorization: () => undefined,
    }).contract;
  }

  stop() {
    this.runtime?.stop();
  }
}

export const plugin = async (context: PluginInitializerContext<ActionsConfig>) =>
  new ActionsTasksPlugin(context);

export const config: PluginConfigDescriptor<ActionsConfig> = { schema: configSchema };
