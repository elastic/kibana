/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  STREAMS_KI_SYNC_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import { createSyncWorkflowService } from './sync_workflow';

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => ({
  getWorkflow: jest.fn().mockResolvedValue({
    id: STREAMS_KI_SYNC_WORKFLOW_ID,
    enabled: false,
  }),
  updateWorkflow: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const setup = (overrides: Record<string, jest.Mock> = {}) => {
  const managementApi = createMockManagementApi(overrides);
  const logger = loggingSystemMock.createLogger();
  const service = createSyncWorkflowService({
    logger,
    managementApi: managementApi as never,
  });
  return { service, managementApi, logger };
};

describe('createSyncWorkflowService', () => {
  describe('ensureScheduled', () => {
    it('enables the workflow in the default space when it is installed but disabled', async () => {
      const { service, managementApi } = setup();
      const request = httpServerMock.createKibanaRequest();

      await service.ensureScheduled({ request });

      expect(managementApi.getWorkflow).toHaveBeenCalledWith(STREAMS_KI_SYNC_WORKFLOW_ID, 'default');
      expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
        STREAMS_KI_SYNC_WORKFLOW_ID,
        { enabled: true },
        'default',
        request
      );
    });

    it('is a no-op when the workflow is already enabled', async () => {
      const { service, managementApi } = setup({
        getWorkflow: jest
          .fn()
          .mockResolvedValue({ id: STREAMS_KI_SYNC_WORKFLOW_ID, enabled: true }),
      });

      await service.ensureScheduled({ request: httpServerMock.createKibanaRequest() });

      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });

    it('skips when the managed workflow is not installed yet', async () => {
      const { service, managementApi } = setup({
        getWorkflow: jest.fn().mockResolvedValue(null),
      });

      await service.ensureScheduled({ request: httpServerMock.createKibanaRequest() });

      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });

    it('swallows errors so it never blocks KI identification', async () => {
      const { service, managementApi, logger } = setup({
        getWorkflow: jest.fn().mockRejectedValue(new Error('boom')),
      });

      await expect(
        service.ensureScheduled({ request: httpServerMock.createKibanaRequest() })
      ).resolves.toBeUndefined();

      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
      expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
    });
  });
});

describe('sync.yaml managed workflow contract', () => {
  const definition = getManagedWorkflowDefinition(STREAMS_KI_SYNC_WORKFLOW_ID);

  it('is registered as a restorable managed workflow', () => {
    expect(definition?.management.enablement).toBe('restorable');
  });

  it('ships disabled so it is scheduled lazily on first KI identification', () => {
    if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
      throw new Error('Sync managed workflow definition is missing inline YAML');
    }
    expect(definition.yaml).toContain('enabled: false');
  });
});
