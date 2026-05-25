/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ServerTriggerDefinition,
  WorkflowsExtensionsServerPluginSetup,
} from '@kbn/workflows-extensions/server';

/**
 * Registers all alerting-v2 server-side workflow trigger definitions.
 * Call once during plugin setup .
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  const triggerDefinitions: ServerTriggerDefinition[] = [
    // Add CommonTriggerDefinition-backed entries here (import from common when added).
  ];

  for (const definition of triggerDefinitions) {
    workflowsExtensions.registerTriggerDefinition(definition);
  }
}
