/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/episode_assigned').then((m) => m.episodeAssignedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_created').then((m) => m.ruleCreatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_updated').then((m) => m.ruleUpdatedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_deleted').then((m) => m.ruleDeletedTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_enabled').then((m) => m.ruleEnabledTriggerPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/rule_disabled').then((m) => m.ruleDisabledTriggerPublicDefinition)
  );
}
