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
    import('./triggers/rule_signals_written').then(
      (m) => m.ruleSignalsWrittenTriggerPublicDefinition
    )
  );
}
