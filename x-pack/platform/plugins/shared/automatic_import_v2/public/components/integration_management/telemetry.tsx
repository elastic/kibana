/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { TelemetryEventType } from '../../services/telemetry/types';
import { useKibana } from '../../common/hooks/use_kibana';

type ReportIntegrationManagementOpen = () => void;

type ReportDataStreamFlyoutOpen = (params: { datastreamName: string }) => void;

type ReportUploadLogsComplete = (params: { datastreamName: string; error?: string }) => void;

type ReportViewResultsFlyoutOpen = (params: {
  datastreamName: string;
  sampleRows: number;
  model: string;
  provider: string;
  error?: string;
}) => void;

type ReportAutomaticImportComplete = (params: {
  integrationName: string;
  integrationDescription: string;
  dataStreamNames: string[];
  inputTypes: string[];
  actionTypeId: string;
  model: string;
  provider: string;
  error?: string;
}) => void;

interface TelemetryContextProps {
  reportIntegrationManagementOpen: ReportIntegrationManagementOpen;
  reportDataStreamFlyoutOpen: ReportDataStreamFlyoutOpen;
  reportUploadLogsComplete: ReportUploadLogsComplete;
  reportViewResultsFlyoutOpen: ReportViewResultsFlyoutOpen;
  reportAutomaticImportComplete: ReportAutomaticImportComplete;
}

const TelemetryContext = React.createContext<TelemetryContextProps | null>(null);

/**
 * Hook to easily use telemetry reporting functions.
 * Restricted by the events defined in the telemetry service.
 * @throws Error if used outside provider
 */
export const useTelemetry = () => {
  const context = React.useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryContextProvider');
  }
  return context;
};

export const TelemetryContextProvider: React.FC<{ children: React.ReactNode }> = React.memo(
  ({ children }) => {
    const sessionData = useRef({ sessionId: uuidV4(), startedAt: Date.now() });
    const { telemetry } = useKibana().services;

    const reportIntegrationManagementOpen = useCallback<ReportIntegrationManagementOpen>(() => {
      const sessionId = uuidV4();
      sessionData.current = { sessionId, startedAt: Date.now() };
      telemetry.reportEvent(TelemetryEventType.IntegrationManagementOpen, {
        sessionId,
      });
    }, [telemetry]);

    const reportDataStreamFlyoutOpen = useCallback<ReportDataStreamFlyoutOpen>(
      ({ datastreamName }) => {
        telemetry.reportEvent(TelemetryEventType.CreateManageDataStreamFlyoutOpen, {
          sessionId: sessionData.current.sessionId,
          datastreamName,
        });
      },
      [telemetry]
    );

    const reportUploadLogsComplete = useCallback<ReportUploadLogsComplete>(
      ({ datastreamName, error }) => {
        telemetry.reportEvent(TelemetryEventType.UploadDatastreamLogsZipCompleteData, {
          datastreamName,
          errorMessage: error,
        });
      },
      [telemetry]
    );

    const reportViewResultsFlyoutOpen = useCallback<ReportViewResultsFlyoutOpen>(
      ({ datastreamName, sampleRows, model, provider, error }) => {
        telemetry.reportEvent(TelemetryEventType.ViewResultsFlyoutOpen, {
          sessionId: sessionData.current.sessionId,
          datastreamName,
          sampleRows,
          model,
          provider,
          errorMessage: error,
        });
      },
      [telemetry]
    );

    const reportAutomaticImportComplete = useCallback<ReportAutomaticImportComplete>(
      ({
        integrationName,
        integrationDescription,
        dataStreamNames,
        inputTypes,
        actionTypeId,
        model,
        provider,
        error,
      }) => {
        telemetry.reportEvent(TelemetryEventType.AutomaticImportComplete, {
          sessionId: sessionData.current.sessionId,
          integrationName,
          integrationDescription,
          dataStreamNames,
          inputTypes,
          actionTypeId,
          model,
          provider,
          errorMessage: error,
        });
      },
      [telemetry]
    );

    const value = useMemo<TelemetryContextProps>(
      () => ({
        reportIntegrationManagementOpen,
        reportDataStreamFlyoutOpen,
        reportUploadLogsComplete,
        reportViewResultsFlyoutOpen,
        reportAutomaticImportComplete,
      }),
      [
        reportIntegrationManagementOpen,
        reportDataStreamFlyoutOpen,
        reportUploadLogsComplete,
        reportViewResultsFlyoutOpen,
        reportAutomaticImportComplete,
      ]
    );

    return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
  }
);
TelemetryContextProvider.displayName = 'TelemetryContextProvider';
