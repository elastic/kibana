/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExtensionsPublicServiceContract } from '../../services/workflow_extensions_service';

/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the resolved {@link WorkflowExtensionsService}.
 */
export function registerTriggerDefinitions(
  workflowExtensionsService: WorkflowExtensionsPublicServiceContract
): void {
  workflowExtensionsService.registerPublicTriggerDefinitions([
    // Add PublicTriggerDefinition entries here (spread common id + eventSchema + title, icon, docs).
  ]);
}
