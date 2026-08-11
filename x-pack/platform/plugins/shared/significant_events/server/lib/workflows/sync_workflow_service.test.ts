/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createSyncWorkflowService } from './sync_workflow';

const createLogger = (): Logger => {
  const logger = {
    get: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  } as unknown as Logger;
  (logger.get as jest.Mock).mockReturnValue(logger);
  return logger;
};

const createManagementApi = () =>
  ({
    getWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>);

const request = {} as KibanaRequest;

describe('SyncWorkflowService', () => {
  let logger: Logger;
  let managementApi: ReturnType<typeof createManagementApi>;

  beforeEach(() => {
    logger = createLogger();
    managementApi = createManagementApi();
  });

  it('enables the workflow when it is installed but disabled', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: false });

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

  it('is a no-op when the workflow is already enabled', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue({ enabled: true });

    const service = createSyncWorkflowService({ logger, managementApi });
    await service.ensureEnabled({ request });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('does not update when the workflow is not installed yet', async () => {
    (managementApi.getWorkflow as jest.Mock).mockResolvedValue(undefined);

    const service = createSyncWorkflowService({ logger, managementApi });
    await service.ensureEnabled({ request });

    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
