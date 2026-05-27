/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PublicTriggerDefinition,
  WorkflowsExtensionsPublicPluginSetup,
} from '@kbn/workflows-extensions/public';

/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  const triggerDefinitions: PublicTriggerDefinition[] = [
    // Add PublicTriggerDefinition entries here (spread common id + eventSchema + title, icon, docs).
  ];

  for (const definition of triggerDefinitions) {
    workflowsExtensions.registerTriggerDefinition(definition);
  }
}
