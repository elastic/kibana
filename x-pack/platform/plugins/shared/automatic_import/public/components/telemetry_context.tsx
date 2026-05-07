/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef, type PropsWithChildren } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { useKibana } from '../common/hooks/use_kibana';
import { AutomaticImportTelemetryEventType } from '../../common/telemetry/types';

export type LogsSource = 'file' | 'index';
type ReportDataStreamFlyoutOpened = (params: { integrationId?: string }) => void;

type ReportEditDataStreamFlyoutOpened = (params?: {
  integrationId?: string;
  dataStreamId?: string;
}) => void;

type ReportAnalyzeLogsTriggered = (params: {
  integrationId?: string;
  dataStreamId?: string;
  logsSource: LogsSource;
  inputTypes: string[];
}) => void;

type ReportEditPipelineTabOpened = (params?: {
  integrationId?: string;
  dataStreamId?: string;
}) => void;

type ReportCodeEditorCopyClicked = (params?: {
  integrationId?: string;
  dataStreamId?: string;
}) => void;

type ReportCancelButtonClicked = (params?: { integrationId?: string }) => void;

type ReportDoneButtonClicked = (params?: { integrationId?: string }) => void;

type ReportDataStreamDeleteConfirmed = (params?: {
  integrationId?: string;
  dataStreamId?: string;
}) => void;

type ReportDataStreamRefreshConfirmed = (params?: {
  integrationId?: string;
  dataStreamId?: string;
}) => void;

type ReportPipelineEdited = (params: {
  integrationId?: string;
  dataStreamId?: string;
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

export const TelemetryContextProvider = React.memo<PropsWithChildren>(({ children }) => {
  const sessionData = useRef({ sessionId: uuidV4() });
  const { telemetry } = useKibana().services;

  const reportDataStreamFlyoutOpened = useCallback<ReportDataStreamFlyoutOpened>(
    ({ integrationId: intId }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId: intId,
      });
    },
    [telemetry]
  );

  const reportEditDataStreamFlyoutOpened = useCallback<ReportEditDataStreamFlyoutOpened>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.EditDataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
        dataStreamId: params?.dataStreamId,
      });
    },
    [telemetry]
  );

  const reportAnalyzeLogsTriggered = useCallback<ReportAnalyzeLogsTriggered>(
    ({ integrationId: intId, dataStreamId, logsSource, inputTypes }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.AnalyzeLogsTriggered, {
        sessionId: sessionData.current.sessionId,
        integrationId: intId,
        dataStreamId,
        logsSource,
        inputTypes,
      });
    },
    [telemetry]
  );

  const reportEditPipelineTabOpened = useCallback<ReportEditPipelineTabOpened>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.EditPipelineTabOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
        dataStreamId: params?.dataStreamId,
      });
    },
    [telemetry]
  );

  const reportCodeEditorCopyClicked = useCallback<ReportCodeEditorCopyClicked>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.CodeEditorCopyClicked, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
        dataStreamId: params?.dataStreamId,
      });
    },
    [telemetry]
  );

  const reportCancelButtonClicked = useCallback<ReportCancelButtonClicked>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.CancelButtonClicked, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
      });
    },
    [telemetry]
  );

  const reportDoneButtonClicked = useCallback<ReportDoneButtonClicked>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.DoneButtonClicked, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
      });
    },
    [telemetry]
  );

  const reportDataStreamDeleteConfirmed = useCallback<ReportDataStreamDeleteConfirmed>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamDeleteConfirmed, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
        dataStreamId: params?.dataStreamId,
      });
    },
    [telemetry]
  );

  const reportDataStreamRefreshConfirmed = useCallback<ReportDataStreamRefreshConfirmed>(
    (params) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.DataStreamRefreshConfirmed, {
        sessionId: sessionData.current.sessionId,
        integrationId: params?.integrationId,
        dataStreamId: params?.dataStreamId,
      });
    },
    [telemetry]
  );

  const reportPipelineEdited = useCallback<ReportPipelineEdited>(
    ({ integrationId: intId, dataStreamId, linesAdded, linesRemoved, netLineChange }) => {
      telemetry?.reportEvent(AutomaticImportTelemetryEventType.PipelineEdited, {
        sessionId: sessionData.current.sessionId,
        integrationId: intId,
        dataStreamId,
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
