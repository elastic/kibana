/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef, useEffect, type PropsWithChildren } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { useKibana } from '../common/hooks/use_kibana';
import { AutomaticImportTelemetryEventType } from '../../common/telemetry/types';

export type LogsSource = 'file' | 'index';
type ReportDataStreamFlyoutOpened = (params: { isFirstDataStream: boolean }) => void;

type ReportEditDataStreamFlyoutOpened = () => void;

type ReportAnalyzeLogsTriggered = (params: { logsSource: LogsSource }) => void;

type ReportEditPipelineTabOpened = () => void;

type ReportCodeEditorCopyClicked = () => void;

type ReportCancelButtonClicked = () => void;

type ReportDoneButtonClicked = () => void;

type ReportDataStreamDeleteConfirmed = () => void;

type ReportDataStreamRefreshConfirmed = () => void;

type ReportPipelineEdited = (params: {
  linesAdded: number;
  linesRemoved: number;
  netLineChange: number;
}) => void;

interface TelemetryContextProps {
  sessionId: string;
  reportDataStreamFlyoutOpened: ReportDataStreamFlyoutOpened;
  reportEditDataStreamFlyoutOpened: ReportEditDataStreamFlyoutOpened;
  reportAnalyzeLogsTriggered: ReportAnalyzeLogsTriggered;
  reportEditPipelineTabOpened: ReportEditPipelineTabOpened;
  reportCodeEditorCopyClicked: ReportCodeEditorCopyClicked;
  reportCancelButtonClicked: ReportCancelButtonClicked;
  reportDoneButtonClicked: ReportDoneButtonClicked;
  reportDataStreamDeleteConfirmed: ReportDataStreamDeleteConfirmed;
  reportDataStreamRefreshConfirmed: ReportDataStreamRefreshConfirmed;
  reportPipelineEdited: ReportPipelineEdited;
}

const defaultTelemetryContext: TelemetryContextProps = {
  sessionId: '',
  reportDataStreamFlyoutOpened: () => {},
  reportEditDataStreamFlyoutOpened: () => {},
  reportAnalyzeLogsTriggered: () => {},
  reportEditPipelineTabOpened: () => {},
  reportCodeEditorCopyClicked: () => {},
  reportCancelButtonClicked: () => {},
  reportDoneButtonClicked: () => {},
  reportDataStreamDeleteConfirmed: () => {},
  reportDataStreamRefreshConfirmed: () => {},
  reportPipelineEdited: () => {},
};

const TelemetryContext = React.createContext<TelemetryContextProps>(defaultTelemetryContext);

export const useTelemetry = () => {
  return React.useContext(TelemetryContext);
};

export const TelemetryContextProvider = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const sessionData = useRef({ sessionId: uuidV4() });
  const pageLoadReported = useRef(false);

  const { telemetry } = useKibana().services;

  // Report page load event once when provider mounts
  useEffect(() => {
    if (!pageLoadReported.current && telemetry) {
      pageLoadReported.current = true;
      telemetry.reportEvent(AutomaticImportTelemetryEventType.CreateIntegrationPageLoaded, {
        sessionId: sessionData.current.sessionId,
      });
    }
  }, [telemetry]);

  const reportDataStreamFlyoutOpened = useCallback<ReportDataStreamFlyoutOpened>(
    ({ isFirstDataStream }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        isFirstDataStream,
      });
    },
    [telemetry]
  );

  const reportEditDataStreamFlyoutOpened = useCallback<ReportEditDataStreamFlyoutOpened>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.EditDataStreamFlyoutOpened, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportAnalyzeLogsTriggered = useCallback<ReportAnalyzeLogsTriggered>(
    ({ logsSource }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.AnalyzeLogsTriggered, {
        sessionId: sessionData.current.sessionId,
        logsSource,
      });
    },
    [telemetry]
  );

  const reportEditPipelineTabOpened = useCallback<ReportEditPipelineTabOpened>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.EditPipelineTabOpened, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportCodeEditorCopyClicked = useCallback<ReportCodeEditorCopyClicked>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.CodeEditorCopyClicked, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportCancelButtonClicked = useCallback<ReportCancelButtonClicked>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.CancelButtonClicked, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportDoneButtonClicked = useCallback<ReportDoneButtonClicked>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.DoneButtonClicked, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportDataStreamDeleteConfirmed = useCallback<ReportDataStreamDeleteConfirmed>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamDeleteConfirmed, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportDataStreamRefreshConfirmed = useCallback<ReportDataStreamRefreshConfirmed>(() => {
    telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamRefreshConfirmed, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportPipelineEdited = useCallback<ReportPipelineEdited>(
    ({ linesAdded, linesRemoved, netLineChange }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.PipelineEdited, {
        sessionId: sessionData.current.sessionId,
        linesAdded,
        linesRemoved,
        netLineChange,
      });
    },
    [telemetry]
  );

  const value = useMemo<TelemetryContextProps>(
    () => ({
      sessionId: sessionData.current.sessionId,
      reportDataStreamFlyoutOpened,
      reportEditDataStreamFlyoutOpened,
      reportAnalyzeLogsTriggered,
      reportEditPipelineTabOpened,
      reportCodeEditorCopyClicked,
      reportCancelButtonClicked,
      reportDoneButtonClicked,
      reportDataStreamDeleteConfirmed,
      reportDataStreamRefreshConfirmed,
      reportPipelineEdited,
    }),
    [
      reportDataStreamFlyoutOpened,
      reportEditDataStreamFlyoutOpened,
      reportAnalyzeLogsTriggered,
      reportEditPipelineTabOpened,
      reportCodeEditorCopyClicked,
      reportCancelButtonClicked,
      reportDoneButtonClicked,
      reportDataStreamDeleteConfirmed,
      reportDataStreamRefreshConfirmed,
      reportPipelineEdited,
    ]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
});
TelemetryContextProvider.displayName = 'TelemetryContextProvider';
