/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { TelemetryContextProvider, useTelemetry } from './telemetry_context';
import { AIV2TelemetryEventType } from '../../common';

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

describe('TelemetryContextProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires CreateIntegrationPageLoaded once on mount', () => {
    render(
      <TelemetryContextProvider>
        <div />
      </TelemetryContextProvider>
    );

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.CreateIntegrationPageLoaded,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('does not fire CreateIntegrationPageLoaded more than once on re-render', () => {
    const { rerender } = render(
      <TelemetryContextProvider>
        <div />
      </TelemetryContextProvider>
    );

    rerender(
      <TelemetryContextProvider>
        <div />
      </TelemetryContextProvider>
    );

    expect(mockReportEvent).toHaveBeenCalledTimes(1);
  });
});

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
      result.current.reportDataStreamFlyoutOpened({
        isFirstDataStream: true,
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.DataStreamFlyoutOpened,
      expect.objectContaining({
        sessionId: expect.any(String),
        isFirstDataStream: true,
      })
    );
  });

  it('reportEditDataStreamFlyoutOpened calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportEditDataStreamFlyoutOpened();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.EditDataStreamFlyoutOpened,
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
      });
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.AnalyzeLogsTriggered,
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
      AIV2TelemetryEventType.EditPipelineTabOpened,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportCodeEditorCopyClicked calls reportEvent with correct args', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportCodeEditorCopyClicked();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.CodeEditorCopyClicked,
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
      AIV2TelemetryEventType.CancelButtonClicked,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDoneButtonClicked calls reportEvent with sessionId', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDoneButtonClicked();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.DoneButtonClicked,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDataStreamDeleteConfirmed calls reportEvent', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDataStreamDeleteConfirmed();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.DataStreamDeleteConfirmed,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportIntegrationDeleteConfirmed calls reportEvent', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportIntegrationDeleteConfirmed();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.IntegrationDeleteConfirmed,
      expect.objectContaining({ sessionId: expect.any(String) })
    );
  });

  it('reportDataStreamRefreshConfirmed calls reportEvent', () => {
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.reportDataStreamRefreshConfirmed();
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      AIV2TelemetryEventType.DataStreamRefreshConfirmed,
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
      AIV2TelemetryEventType.PipelineEdited,
      expect.objectContaining({
        sessionId: expect.any(String),
        linesAdded: 5,
        linesRemoved: 2,
        netLineChange: 3,
      })
    );
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
