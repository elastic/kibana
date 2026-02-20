/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server/workflows_management/workflows_management_api';

export const createWorkflowsManagementApi = (): jest.Mocked<WorkflowsManagementApi> =>
  ({
    getWorkflow: jest.fn(),
    runWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsManagementApi>);
