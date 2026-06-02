/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import {
  ruleCreatedTriggerCommonDefinition,
  ruleDeletedTriggerCommonDefinition,
  ruleDisabledTriggerCommonDefinition,
  ruleEnabledTriggerCommonDefinition,
  ruleUpdatedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';
import { ALERT_ACTION_WORKFLOW_TRIGGERS } from '../events/alert_action_workflow_subscriber/triggers';

const RULE_WORKFLOW_TRIGGER_DEFINITIONS = [
  ruleCreatedTriggerCommonDefinition,
  ruleUpdatedTriggerCommonDefinition,
  ruleDeletedTriggerCommonDefinition,
  ruleEnabledTriggerCommonDefinition,
  ruleDisabledTriggerCommonDefinition,
];

/**
 * Registers all alerting-v2 server-side workflow trigger definitions.
 *
 * Alert-action triggers are registered from {@link ALERT_ACTION_WORKFLOW_TRIGGERS},
 * the same catalog the `AlertActionWorkflowSubscriber` walks at dispatch time.
 * Rule lifecycle triggers are registered from {@link RULE_WORKFLOW_TRIGGER_DEFINITIONS}.
 *
 * Call once during plugin setup.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  for (const trigger of ALERT_ACTION_WORKFLOW_TRIGGERS) {
    workflowsExtensions.registerTriggerDefinition(trigger.definition);
  }

  for (const definition of RULE_WORKFLOW_TRIGGER_DEFINITIONS) {
    workflowsExtensions.registerTriggerDefinition(definition);
  }
}
