/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementCapabilities } from '@kbn/workflows-ui';

export const mockWorkflowsManagementCapabilities: WorkflowsManagementCapabilities = {
  canCreateWorkflow: true,
  canReadWorkflow: true,
  canReadManagedWorkflow: true,
  canUpdateWorkflow: true,
  canDeleteWorkflow: true,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canReadManagedWorkflowExecution: true,
  canCancelWorkflowExecution: true,
};

export const useWorkflowsCapabilities = jest.fn(
  (): WorkflowsManagementCapabilities => mockWorkflowsManagementCapabilities
);
