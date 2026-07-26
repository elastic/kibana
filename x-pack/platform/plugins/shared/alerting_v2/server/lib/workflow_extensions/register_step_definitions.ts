/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

type ServerStepDefinitionOrLoader = Parameters<
  WorkflowsExtensionsServerPluginSetup['registerStepDefinition']
>[0];

/**
 * Registers all alerting-v2 server-side workflow step definitions.
 * Called once during plugin setup.
 */
export function registerStepDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  const stepDefinitions: ServerStepDefinitionOrLoader[] = [
    // Add ServerStepDefinition or loader entries here.
  ];

  for (const definition of stepDefinitions) {
    workflowsExtensions.registerStepDefinition(definition);
  }
}
