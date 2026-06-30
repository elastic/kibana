/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { ALERT_ACTION_WORKFLOW_TRIGGERS } from '../events/alert_action_workflow_subscriber/triggers';

/**
 * Registers all alerting-v2 server-side workflow trigger definitions.
 *
 * Walks {@link ALERT_ACTION_WORKFLOW_TRIGGERS}, the same catalog the
 * `AlertActionWorkflowSubscriber` walks at dispatch time, so the
 * registered schema, the trigger id, and the runtime payload mapping
 * cannot drift across the codebase.
 *
 * Call once during plugin setup.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  for (const trigger of ALERT_ACTION_WORKFLOW_TRIGGERS) {
    workflowsExtensions.registerTriggerDefinition(trigger.definition);
  }
}
