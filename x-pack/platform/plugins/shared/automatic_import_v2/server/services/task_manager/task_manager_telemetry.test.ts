/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { TaskManagerService } from './task_manager_service';
import { AIV2TelemetryEventType } from '../../../common';

describe('TaskManagerService telemetry', () => {
  let mockAnalytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;
  let service: TaskManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();

    service = new TaskManagerService(
      loggerMock.create(),
      { registerTaskDefinitions: jest.fn() } as any,
      {} as any,
      mockAnalytics as any,
      {} as any
    );
  });

  describe('reportDataStreamCreationComplete', () => {
    it('reports DataStreamCreationComplete on success', () => {
      (service as any).reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        durationMs: 1234,
        success: true,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AIV2TelemetryEventType.DataStreamCreationComplete,
        expect.objectContaining({
          sessionId: 'server-task',
          integrationId: 'int-1',
          integrationName: 'My Integration',
          dataStreamId: 'ds-1',
          dataStreamName: 'My DataStream',
          durationMs: 1234,
          success: true,
        })
      );
    });

    it('reports DataStreamCreationComplete on failure with errorMessage', () => {
      (service as any).reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        durationMs: 500,
        success: false,
        errorMessage: 'Something went wrong',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AIV2TelemetryEventType.DataStreamCreationComplete,
        expect.objectContaining({
          success: false,
          errorMessage: 'Something went wrong',
        })
      );
    });

    it('does not include errorMessage when not provided', () => {
      (service as any).reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        durationMs: 100,
        success: true,
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1];
      expect(payload).not.toHaveProperty('errorMessage');
    });

    it('does not throw when analytics.reportEvent throws', () => {
      (mockAnalytics.reportEvent as jest.Mock).mockImplementation(() => {
        throw new Error('analytics unavailable');
      });

      expect(() =>
        (service as any).reportDataStreamCreationComplete({
          integrationId: 'int-1',
          integrationName: 'My Integration',
          dataStreamId: 'ds-1',
          dataStreamName: 'My DataStream',
          durationMs: 100,
          success: true,
        })
      ).not.toThrow();
    });
  });
});
