/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskManagerService } from './task_manager_service';
import { AutomaticImportTelemetryEventType } from '../../../common';
import type { AutomaticImportPluginStartDependencies } from '../../types';
import type { AutomaticImportSamplesIndexService } from '../samples_index/index_service';

interface ReportDataStreamCreationCompleteParams {
  integrationId: string;
  integrationName: string;
  dataStreamId: string;
  dataStreamName: string;
  connectorId: string;
  modelName?: string;
  connectorType?: string;
  connectorName?: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

interface TaskManagerServiceWithPrivateTelemetry {
  reportDataStreamCreationComplete: (params: ReportDataStreamCreationCompleteParams) => void;
}

describe('TaskManagerService telemetry', () => {
  let mockAnalytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;
  let service: TaskManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalytics = analyticsServiceMock.createAnalyticsServiceSetup();

    const mockTaskManagerSetup = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as TaskManagerSetupContract;
    const mockCore = {} as unknown as CoreSetup<AutomaticImportPluginStartDependencies>;
    const mockSamplesIndex = {} as unknown as AutomaticImportSamplesIndexService;

    service = new TaskManagerService(
      loggerMock.create(),
      mockTaskManagerSetup,
      mockCore,
      mockAnalytics,
      mockSamplesIndex
    );
  });

  const reportDataStreamCreationComplete = (params: ReportDataStreamCreationCompleteParams) => {
    (service as unknown as TaskManagerServiceWithPrivateTelemetry).reportDataStreamCreationComplete(
      params
    );
  };

  describe('reportDataStreamCreationComplete', () => {
    it('reports DataStreamCreationComplete on success', () => {
      reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        connectorId: 'conn-1',
        durationMs: 1234,
        success: true,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AutomaticImportTelemetryEventType.DataStreamCreationComplete,
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
      reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        connectorId: 'conn-1',
        durationMs: 500,
        success: false,
        errorMessage: 'Something went wrong',
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AutomaticImportTelemetryEventType.DataStreamCreationComplete,
        expect.objectContaining({
          success: false,
          errorMessage: 'Something went wrong',
        })
      );
    });

    it('does not include errorMessage when not provided', () => {
      reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        connectorId: 'conn-1',
        durationMs: 100,
        success: true,
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1];
      expect(payload).not.toHaveProperty('errorMessage');
    });

    it('includes modelName, connectorType, and connectorName when provided', () => {
      reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        connectorId: 'conn-1',
        modelName: 'claude-3-5-sonnet-20241022',
        connectorType: '.bedrock',
        connectorName: 'My Bedrock Connector',
        durationMs: 100,
        success: true,
      });

      expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
        AutomaticImportTelemetryEventType.DataStreamCreationComplete,
        expect.objectContaining({
          modelName: 'claude-3-5-sonnet-20241022',
          connectorType: '.bedrock',
          connectorName: 'My Bedrock Connector',
        })
      );
    });

    it('omits modelName, connectorType, connectorName when undefined', () => {
      reportDataStreamCreationComplete({
        integrationId: 'int-1',
        integrationName: 'My Integration',
        dataStreamId: 'ds-1',
        dataStreamName: 'My DataStream',
        connectorId: 'conn-1',
        durationMs: 100,
        success: true,
      });

      const payload = (mockAnalytics.reportEvent as jest.Mock).mock.calls[0][1];
      expect(payload).not.toHaveProperty('modelName');
      expect(payload).not.toHaveProperty('connectorType');
      expect(payload).not.toHaveProperty('connectorName');
    });

    it('does not throw when analytics.reportEvent throws', () => {
      (mockAnalytics.reportEvent as jest.Mock).mockImplementation(() => {
        throw new Error('analytics unavailable');
      });

      expect(() =>
        reportDataStreamCreationComplete({
          integrationId: 'int-1',
          integrationName: 'My Integration',
          dataStreamId: 'ds-1',
          dataStreamName: 'My DataStream',
          connectorId: 'conn-1',
          durationMs: 100,
          success: true,
        })
      ).not.toThrow();
    });
  });
});
