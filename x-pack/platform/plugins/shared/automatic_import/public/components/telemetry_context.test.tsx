/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { TelemetryContextProvider, useTelemetry } from './telemetry_context';
import { AutomaticImportTelemetryEventType } from '../../common';

const mockReportEvent = jest.fn();
let mockTelemetryService: { reportEvent: jest.Mock } | undefined = {
  reportEvent: mockReportEvent,
};

jest.mock('../common/hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      get telemetry() {
        return mockTelemetryService;
      },
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TelemetryContextProvider>{children}</TelemetryContextProvider>
);

describe('useTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a stable sessionId', () => {
    const { result, rerender } = renderHook(() => useTelemetry(), { wrapper });
    const firstId = result.current.sessionId;
    rerender();
    expect(result.current.sessionId).toBe(firstId);
  });

  it('reportDataStreamFlyoutOpened calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDataStreamFlyoutOpened({});
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.DataStreamFlyoutOpened,
      expect.objectContaining({
        sessionId: expect.any(String),
      })
    );
  });

  it('reportEditDataStreamFlyoutOpened calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportEditDataStreamFlyoutOpened();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.EditDataStreamFlyoutOpened,
      expect.objectContaining({
        sessionId: expect.any(String),
      })
    );
  });

  it('reportAnalyzeLogsTriggered calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportAnalyzeLogsTriggered({
        logsSource: 'file',
        inputTypes: ['filestream'],
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.AnalyzeLogsTriggered,
      expect.objectContaining({
        sessionId: expect.any(String),
        logsSource: 'file',
      })
    );
  });

  it('reportEditPipelineTabOpened calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportEditPipelineTabOpened();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.EditPipelineTabOpened,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportCodeEditorCopyClicked calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportCodeEditorCopyClicked();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.CodeEditorCopyClicked,
      expect.objectContaining({
        sessionId: expect.any(String),
      })
    );
  });

  it('reportCancelButtonClicked calls reportEvent with sessionId', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportCancelButtonClicked();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.CancelButtonClicked,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDoneButtonClicked calls reportEvent with sessionId', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDoneButtonClicked();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.DoneButtonClicked,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDataStreamDeleteConfirmed calls reportEvent', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDataStreamDeleteConfirmed();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.DataStreamDeleteConfirmed,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDataStreamRefreshConfirmed calls reportEvent', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDataStreamRefreshConfirmed();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.DataStreamRefreshConfirmed,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportPipelineEdited calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportPipelineEdited({
        linesAdded: 5,
        linesRemoved: 2,
        netLineChange: 3,
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AutomaticImportTelemetryEventType.PipelineEdited,
      expect.objectContaining({
        sessionId: expect.any(String),
        linesAdded: 5,
        linesRemoved: 2,
        netLineChange: 3,
      })
    );
  });

  it.each([
    [
      'reportFieldTypeStaged',
      AutomaticImportTelemetryEventType.FieldTypeStaged,
      { fromType: 'long', toType: 'keyword', isRevert: false },
    ],
    [
      'reportSyncToTableBlocked',
      AutomaticImportTelemetryEventType.SyncToTableBlocked,
      { reason: 'pipeline_errors' },
    ],
    [
      'reportPipelineCheckFailed',
      AutomaticImportTelemetryEventType.PipelineCheckFailed,
      { kind: 'field_errors', failingSampleGroups: 0 },
    ],
    [
      'reportBreakingChangesModalClosed',
      AutomaticImportTelemetryEventType.BreakingChangesModalClosed,
      { action: 'cancel', removedApprovedFieldCount: 2 },
    ],
    [
      'reportEditsDiscarded',
      AutomaticImportTelemetryEventType.EditsDiscarded,
      { trigger: 'reset', pendingTypeChangeCount: 1, pipelineDirty: false },
    ],
  ] as const)('%s reports %s with the session ID', (reporterName, eventType, params) => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });
    const reporter = result.current[reporterName] as (
      args: typeof params & { integrationId: string; dataStreamId: string }
    ) => void;

    act(() => {
      reporter({ integrationId: 'int-1', dataStreamId: 'ds-1', ...params });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(eventType, {
      sessionId: expect.any(String),
      integrationId: 'int-1',
      dataStreamId: 'ds-1',
      ...params,
    });
  });
});

describe('TelemetryContextProvider without telemetry service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTelemetryService = undefined;
  });

  afterEach(() => {
    mockTelemetryService = { reportEvent: mockReportEvent };
  });

  it('does not throw when telemetry is undefined', () => {
    expect(() =>
      render(
        <TelemetryContextProvider>
          <div />
        </TelemetryContextProvider>
      )
    ).not.toThrow();
  });

  it('does not call reportEvent when telemetry is undefined', () => {
    render(
      <TelemetryContextProvider>
        <div />
      </TelemetryContextProvider>
    );

    expect(mockReportEvent).not.toHaveBeenCalled();
  });

  it('report functions are no-ops when telemetry is undefined', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportCancelButtonClicked();
      result.current.reportDoneButtonClicked();
      result.current.reportDataStreamDeleteConfirmed();
    });

    expect(mockReportEvent).not.toHaveBeenCalled();
  });
});
