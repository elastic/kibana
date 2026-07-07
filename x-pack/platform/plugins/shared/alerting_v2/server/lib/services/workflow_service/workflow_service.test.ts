/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  createWorkflowsClientMock,
  workflowsExtensionsMock,
} from '@kbn/workflows-extensions/server/mocks';
import type { LoggerService } from '../logger_service/logger_service';
import { createLoggerService } from '../logger_service/logger_service.mock';
import { WorkflowService } from './workflow_service';

type WorkflowsExtensionsStart = ReturnType<typeof workflowsExtensionsMock.createStart>;

const TRIGGER_ID = 'alertingV2.episodeAssigned';
const PAYLOAD = { episodeId: 'episode-1' } as const;

describe('WorkflowService', () => {
  let workflowsExtensions: WorkflowsExtensionsStart;
  let loggerService: LoggerService;
  let service: WorkflowService;
  let mockEmitEvent: jest.Mock;

  beforeEach(() => {
    workflowsExtensions = workflowsExtensionsMock.createStart();
    mockEmitEvent = jest.fn().mockResolvedValue(undefined);
    workflowsExtensions.getClient.mockResolvedValue(
      createWorkflowsClientMock({ emitEvent: mockEmitEvent })
    );

    ({ loggerService } = createLoggerService());

    service = new WorkflowService(workflowsExtensions, loggerService);
  });

  describe('emitEvent', () => {
    it("forwards the caller's request to `workflowsExtensions.getClient` (unchanged) and the (triggerId, payload) pair to the resulting client", async () => {
      const request = httpServerMock.createKibanaRequest();

      await service.emitEvent(request, TRIGGER_ID, PAYLOAD);

      expect(workflowsExtensions.getClient).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.getClient).toHaveBeenCalledWith(request);
      // Reference equality: the service must not wrap or rebuild the request.
      expect(workflowsExtensions.getClient.mock.calls[0][0]).toBe(request);

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(TRIGGER_ID, PAYLOAD);
    });

    it('skips emission when workflows is not available', async () => {
      workflowsExtensions.getClient.mockResolvedValue(
        createWorkflowsClientMock({ isWorkflowsAvailable: false, emitEvent: mockEmitEvent })
      );

      const request = httpServerMock.createKibanaRequest();

      await service.emitEvent(request, TRIGGER_ID, PAYLOAD);

      expect(mockEmitEvent).not.toHaveBeenCalled();
    });

    it('propagates errors thrown by the workflows client', async () => {
      const failure = new Error('execution engine unavailable');
      mockEmitEvent.mockRejectedValueOnce(failure);
      const request = httpServerMock.createKibanaRequest();

      await expect(service.emitEvent(request, TRIGGER_ID, PAYLOAD)).rejects.toBe(failure);
    });

    it('propagates errors thrown while resolving the workflows client', async () => {
      const failure = new Error('client provider crashed');
      workflowsExtensions.getClient.mockRejectedValueOnce(failure);
      const request = httpServerMock.createKibanaRequest();

      await expect(service.emitEvent(request, TRIGGER_ID, PAYLOAD)).rejects.toBe(failure);
    });
  });
});
