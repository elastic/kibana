/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers all alerting-v2 public workflow step definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export function registerCreateAlertEventStep(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/create_alert_event_step').then((m) => m.createAlertEventStepPublicDefinition)
  );
}
