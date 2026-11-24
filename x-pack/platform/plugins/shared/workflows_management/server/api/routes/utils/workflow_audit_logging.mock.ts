/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowManagementAuditLog } from './workflow_audit_logging';
import type { WorkflowsService } from '../../workflows_management_service';

const mockWorkflowsService = {
  getCoreStart: jest.fn().mockResolvedValue({
    security: {
      audit: {
        asScoped: jest.fn(),
        withoutRequest: jest.fn(),
      },
      authc: {
        getCurrentUser: jest.fn(),
      },
    },
  }),
} as unknown as WorkflowsService;

export const createWorkflowManagementAuditLogMock = () => {
  return new WorkflowManagementAuditLog({ service: mockWorkflowsService });
};
