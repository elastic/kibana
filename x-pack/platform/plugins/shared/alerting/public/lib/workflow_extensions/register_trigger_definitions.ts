/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the alerting public workflow trigger definitions (UI metadata) so the Workflows
 * editor can list, validate and autocomplete them. Call once during plugin setup with the
 * `workflowsExtensions` setup contract.
 *
 * Each definition is registered as a loader, so its module and the lazily imported EUI icon
 * stay out of the plugin's page-load bundle until the Workflows editor needs them.
 */
export function registerTriggerDefinitions(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./triggers/alert_status_changed').then(
      (m) => m.alertStatusChangedTriggerPublicDefinition
    )
  );
}
