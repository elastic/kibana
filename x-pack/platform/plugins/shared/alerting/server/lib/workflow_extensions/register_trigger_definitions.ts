/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { alertStatusChangedV1TriggerDefinition } from '../../../common/workflows/triggers';

export function registerTriggerDefinitions(
  workflowsExtensions: Pick<WorkflowsExtensionsTasksSetup, 'registerTriggerDefinition'>
): void {
  workflowsExtensions.registerTriggerDefinition(alertStatusChangedV1TriggerDefinition);
}
