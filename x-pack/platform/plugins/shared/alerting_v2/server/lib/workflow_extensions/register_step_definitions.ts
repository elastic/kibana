/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { getCreateAlertEventStepDefinition } from './steps/create_alert_event_step';

/**
 * Registers all alerting-v2 server-side workflow step definitions.
 * Called once during plugin setup.
 */
export function registerStepDefinitions(
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  logger: Logger
): void {
  workflowsExtensions.registerStepDefinition(getCreateAlertEventStepDefinition(() => logger));
}
