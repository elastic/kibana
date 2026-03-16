/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef, useEffect, type PropsWithChildren } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { useKibana } from '../common/hooks/use_kibana';
import { AIV2TelemetryEventType } from '../../common';

export type LogsSource = 'upload' | 'index';
type ReportDataStreamFlyoutOpened = (params: { integrationId?: string }) => void;

type ReportEditDataStreamFlyoutOpened = (params: {
  integrationId: string;
  dataStreamId: string;
}) => void;

type ReportAnalyzeLogsTriggered = (params: {
  integrationId: string;
  dataStreamId: string;
  logsSource: LogsSource;
}) => void;

type ReportEditPipelineTabOpened = (params: {
  integrationId: string;
  dataStreamId: string;
}) => void;

type ReportCodeEditorCopyClicked = (params: {
  integrationId: string;
  dataStreamId: string;
}) => void;

interface TelemetryContextProps {
  sessionId: string;
  reportDataStreamFlyoutOpened: ReportDataStreamFlyoutOpened;
  reportEditDataStreamFlyoutOpened: ReportEditDataStreamFlyoutOpened;
  reportAnalyzeLogsTriggered: ReportAnalyzeLogsTriggered;
  reportEditPipelineTabOpened: ReportEditPipelineTabOpened;
  reportCodeEditorCopyClicked: ReportCodeEditorCopyClicked;
}

const defaultTelemetryContext: TelemetryContextProps = {
  sessionId: '',
  reportDataStreamFlyoutOpened: () => {},
  reportEditDataStreamFlyoutOpened: () => {},
  reportAnalyzeLogsTriggered: () => {},
  reportEditPipelineTabOpened: () => {},
  reportCodeEditorCopyClicked: () => {},
};

const TelemetryContext = React.createContext<TelemetryContextProps>(defaultTelemetryContext);

export const useTelemetry = () => {
  return React.useContext(TelemetryContext);
};

export const TelemetryContextProvider = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const sessionData = useRef({ sessionId: uuidV4() });

  const { telemetry } = useKibana().services;

  // Report page load event once when provider mounts
  useEffect(() => {
    telemetry?.reportEvent(AIV2TelemetryEventType.CreateIntegrationPageLoaded, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  const reportDataStreamFlyoutOpened = useCallback<ReportDataStreamFlyoutOpened>(
    ({ integrationId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.DataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId,
      });
    },
    [telemetry]
  );

  const reportEditDataStreamFlyoutOpened = useCallback<ReportEditDataStreamFlyoutOpened>(
    ({ integrationId, dataStreamId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.EditDataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId,
        dataStreamId,
      });
    },
    [telemetry]
  );

  const reportAnalyzeLogsTriggered = useCallback<ReportAnalyzeLogsTriggered>(
    ({ integrationId, dataStreamId, logsSource }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.AnalyzeLogsTriggered, {
        sessionId: sessionData.current.sessionId,
        integrationId,
        dataStreamId,
        logsSource,
      });
    },
    [telemetry]
  );

  const reportEditPipelineTabOpened = useCallback<ReportEditPipelineTabOpened>(
    ({ integrationId, dataStreamId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.EditPipelineTabOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId,
        dataStreamId,
      });
    },
    [telemetry]
  );

  const reportCodeEditorCopyClicked = useCallback<ReportCodeEditorCopyClicked>(
    ({ integrationId, dataStreamId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.CodeEditorCopyClicked, {
        sessionId: sessionData.current.sessionId,
        integrationId,
        dataStreamId,
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
    }),
    [
      reportDataStreamFlyoutOpened,
      reportEditDataStreamFlyoutOpened,
      reportAnalyzeLogsTriggered,
      reportEditPipelineTabOpened,
      reportCodeEditorCopyClicked,
    ]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
});
TelemetryContextProvider.displayName = 'TelemetryContextProvider';
