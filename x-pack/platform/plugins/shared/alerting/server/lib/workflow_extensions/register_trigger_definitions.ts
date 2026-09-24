/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { alertStatusChangedTriggerDefinition } from '@kbn/alerting-workflow-triggers';

/**
 * Registers all alerting workflow trigger definitions with the Workflows
 * Extensions platform. Call once during plugin setup.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(alertStatusChangedTriggerDefinition);
}
