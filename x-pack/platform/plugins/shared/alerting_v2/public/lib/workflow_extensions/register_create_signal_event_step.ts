/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the public (UI metadata) definition of the Create Signal workflow step.
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export function registerCreateSignalEventStep(
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void {
  workflowsExtensions.registerStepDefinition(() =>
    import('./steps/create_signal_event_step').then((m) => m.createSignalEventStepPublicDefinition)
  );
}
