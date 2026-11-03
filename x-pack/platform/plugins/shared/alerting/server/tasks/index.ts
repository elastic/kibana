/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, TasksPlugin } from '@kbn/core/server';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type { AlertingServerStart } from '../plugin';
import { alertingBridge } from './bridge';
import { registerTriggerDefinitions } from '../lib/workflow_extensions/register_trigger_definitions';

interface TasksSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsTasksSetup;
}

/**
 * The part of the alerting start contract a task uses: the rules client.
 *
 * In Kibana it is the plugin's own (the bridge). A task pod cannot build one: the rules client
 * authorizes and validates every operation through the rule type registry, which the rule types of
 * some forty plugins fill from their `server` entries, and through the features registry; neither
 * exists in a pod. Asking for the client there fails with an error that says so.
 */
export type AlertingTasksStart = Pick<
  AlertingServerStart,
  'getRulesClientWithRequest' | 'getRulesClientWithRequestInSpace'
>;

const unavailableInPod = async (): Promise<never> => {
  throw new Error(
    'The alerting rules client is not available in a task pod: it needs the rule type registry ' +
      'and the features registry, which are filled by the plugins that run only in Kibana. ' +
      'Run this step or tool in Kibana.'
  );
};

/**
 * The workflows side of alerting for a task pod: the trigger definitions of its workflow events.
 * Events are emitted in Kibana, where the rules run; the pod needs the definitions to run the
 * workflows that they start.
 */
class AlertingTasksPlugin implements TasksPlugin<void, AlertingTasksStart, TasksSetupDeps> {
  setup(_core: CoreTasksSetup, { workflowsExtensions }: TasksSetupDeps) {
    if (workflowsExtensions) registerTriggerDefinitions(workflowsExtensions);
  }

  start(): AlertingTasksStart {
    return (
      alertingBridge.getStart() ?? {
        getRulesClientWithRequest: unavailableInPod,
        getRulesClientWithRequestInSpace: unavailableInPod,
      }
    );
  }
}

export const plugin = async () => new AlertingTasksPlugin();
