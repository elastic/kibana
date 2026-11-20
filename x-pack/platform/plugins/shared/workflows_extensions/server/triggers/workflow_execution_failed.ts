/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  commonWorkflowExecutionFailedTriggerDefinition,
  WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
  workflowExecutionFailedEventSchema,
} from '../../common/triggers/workflow_execution_failed';
import type { ServerTriggerDefinition } from '../types';

export { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID, workflowExecutionFailedEventSchema };
export type { WorkflowExecutionFailedEvent } from '../../common/triggers/workflow_execution_failed';

export const workflowExecutionFailedTriggerDefinition: ServerTriggerDefinition = {
  ...commonWorkflowExecutionFailedTriggerDefinition,
};
