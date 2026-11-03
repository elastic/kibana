/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type {
  WorkflowsExtensionsTasksSetup,
  WorkflowsExtensionsTasksStart,
} from '@kbn/workflows-extensions/server/tasks';
import { createCRUDClientFactory } from '../domain/crud/create_crud_client';
import { registerSteps } from '../workflow/steps';
import { registerTriggers } from '../workflow/triggers';

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
}

interface TasksStartDeps {
  workflowsExtensions: WorkflowsExtensionsTasksStart;
  licensing: LicensingTasksStart;
  security: SecurityTasksStart;
}

/**
 * The workflow side of the Entity Store for a task pod: its triggers and the
 * `entityStore.updateAssetCriticality` step, as the `server` entry registers them. The step's optional
 * risk score recalculation calls a Kibana API, which a pod cannot reach: it is reported in the step's
 * message, as when recalculation fails in Kibana. Extraction, maintainers and the other tasks stay in Kibana.
 */
class EntityStoreTasksPlugin implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps> {
  private readonly createCRUDClient;

  constructor(context: PluginInitializerContext) {
    this.createCRUDClient = createCRUDClientFactory(context.logger.get());
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, { workflowsExtensions }: TasksSetupDeps) {
    const startServices = core.getStartServices();

    registerTriggers(workflowsExtensions);
    registerSteps(workflowsExtensions, {
      getCreateCRUDClient: async () => this.createCRUDClient,
      getWorkflowsExtensions: () =>
        startServices.then(([, pluginsStart]) => pluginsStart.workflowsExtensions),
      getLicensing: () => startServices.then(([, pluginsStart]) => pluginsStart.licensing),
      getSecurity: () => startServices.then(([, pluginsStart]) => pluginsStart.security),
    });

    return {};
  }

  start() {
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new EntityStoreTasksPlugin(context);
