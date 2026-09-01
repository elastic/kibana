/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import { bootstrapSyncWorkflow, createSyncWorkflowService } from './sync_workflow';

const logger = {
  get: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;
(logger.get as jest.Mock).mockReturnValue(logger);

const request = {} as KibanaRequest;

describe('SyncWorkflowService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enables the default-space workflow when disabled', async () => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue({ enabled: false }),
      updateWorkflow: jest.fn().mockResolvedValue({}),
    } as unknown as WorkflowsServerPluginSetup['management'];
    const service = createSyncWorkflowService({ logger, managementApi });

    await service.ensureEnabled({ request });

    expect(managementApi.getWorkflow).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      DEFAULT_SPACE_ID
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      { enabled: true },
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('does not update an already-enabled workflow', async () => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
      updateWorkflow: jest.fn(),
    } as unknown as WorkflowsServerPluginSetup['management'];
    const service = createSyncWorkflowService({ logger, managementApi });

    await service.ensureEnabled({ request });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('does not update when the workflow is not installed', async () => {
    const managementApi = {
      getWorkflow: jest.fn().mockResolvedValue(undefined),
      updateWorkflow: jest.fn(),
    } as unknown as WorkflowsServerPluginSetup['management'];
    const service = createSyncWorkflowService({ logger, managementApi });

    await service.ensureEnabled({ request });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('bootstrapSyncWorkflow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips KI sync bootstrap while maintenance is paused', async () => {
    const ensureEnabled = jest.fn();
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue('paused'),
    } as unknown as SignificantEventsMaintenanceService;

    await bootstrapSyncWorkflow({
      syncWorkflowService: { ensureEnabled },
      maintenanceService,
      request,
      logger,
    });

    expect(ensureEnabled).not.toHaveBeenCalled();
  });
});
