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

// F2: Datastream flyout opens
type ReportDataStreamFlyoutOpened = (params: { integrationId: string }) => void;

// F5: Edit datastream flyout opens
type ReportEditDataStreamFlyoutOpened = (params: {
  integrationId: string;
  dataStreamId: string;
}) => void;

// F3: "Analyze logs" trigger
type ReportAnalyzeLogsTriggered = (params: { integrationId: string; dataStreamId: string }) => void;

// Edit pipeline tab opened
type ReportEditPipelineTabOpened = (params: {
  integrationId: string;
  dataStreamId: string;
}) => void;

// Code editor copy button clicked
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

const TelemetryContext = React.createContext<TelemetryContextProps | null>(null);

export const useTelemetry = () => {
  const context = React.useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryContextProvider');
  }
  return context;
};

export const TelemetryContextProvider = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const sessionData = useRef({ sessionId: uuidV4() });

  const { automaticImportV2 } = useKibana().services;
  const telemetry = automaticImportV2?.telemetry;

  // Report page load event once when provider mounts
  useEffect(() => {
    telemetry?.reportEvent(AIV2TelemetryEventType.CreateIntegrationPageLoaded, {
      sessionId: sessionData.current.sessionId,
    });
  }, [telemetry]);

  // F2: Datastream flyout opens
  const reportDataStreamFlyoutOpened = useCallback<ReportDataStreamFlyoutOpened>(
    ({ integrationId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.DataStreamFlyoutOpened, {
        sessionId: sessionData.current.sessionId,
        integrationId,
      });
    },
    [telemetry]
  );

  // F5: Edit datastream flyout opens
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

  // F3: "Analyze logs" trigger
  const reportAnalyzeLogsTriggered = useCallback<ReportAnalyzeLogsTriggered>(
    ({ integrationId, dataStreamId }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.AnalyzeLogsTriggered, {
        sessionId: sessionData.current.sessionId,
        integrationId,
        dataStreamId,
      });
    },
    [telemetry]
  );

  // Edit pipeline tab opened
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

  // Code editor copy button clicked
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
