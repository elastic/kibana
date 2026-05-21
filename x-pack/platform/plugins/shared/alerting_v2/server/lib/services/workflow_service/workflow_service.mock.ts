/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/server/mocks';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { WorkflowService } from './workflow_service';

export function createWorkflowService(): {
  workflowService: WorkflowService;
  workflowsExtensions: jest.Mocked<WorkflowsExtensionsServerPluginStart>;
} {
  const workflowsExtensions = workflowsExtensionsMock.createStart();
  workflowsExtensions.getClient.mockResolvedValue({
    isWorkflowsAvailable: true,
    emitEvent: jest.fn().mockResolvedValue(undefined),
  });

  const { loggerService } = createLoggerService();
  const workflowService = new WorkflowService(workflowsExtensions, loggerService);

  return { workflowService, workflowsExtensions };
}
