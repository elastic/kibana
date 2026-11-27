/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowExecutionFailedTriggerDefinition } from './workflow_execution_failed';
import type { TriggerRegistry } from '../trigger_registry';

export { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from './workflow_execution_failed';
export type { WorkflowExecutionFailedEvent } from './workflow_execution_failed';
export { workflowExecutionFailedEventSchema } from './workflow_execution_failed';

export const registerInternalTriggerDefinitions = (triggerRegistry: TriggerRegistry): void => {
  triggerRegistry.register(workflowExecutionFailedTriggerDefinition);
};
