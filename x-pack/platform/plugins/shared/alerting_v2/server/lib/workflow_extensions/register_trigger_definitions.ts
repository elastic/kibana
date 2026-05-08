/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExtensionsServiceContract } from '../services/workflow_extensions_service/workflow_extensions_service';

/**
 * Registers all alerting-v2 server-side workflow trigger definitions.
 * Call once during plugin setup with the resolved {@link WorkflowExtensionsService}.
 */
export function registerTriggerDefinitions(
  workflowExtensionsService: WorkflowExtensionsServiceContract
): void {
  workflowExtensionsService.registerTriggerDefinitions([
    // Add CommonTriggerDefinition-backed entries here (import from common when added).
  ]);
}
