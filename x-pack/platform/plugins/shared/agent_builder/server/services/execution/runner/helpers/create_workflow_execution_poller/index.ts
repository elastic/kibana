/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { getExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { WorkflowExecutionPoller } from '../../../run_agent/hitl_workflow_executions';

export const createWorkflowExecutionPoller = ({
  inboxEnabled,
  spaceId,
  workflowsManagement,
}: {
  inboxEnabled?: boolean;
  spaceId: string;
  workflowsManagement?: WorkflowsServerPluginSetup;
}): WorkflowExecutionPoller | undefined => {
  if (!inboxEnabled || !workflowsManagement) {
    return undefined;
  }

  const { management: workflowApi } = workflowsManagement;

  return (executionId: string) => getExecutionState({ executionId, spaceId, workflowApi });
};
