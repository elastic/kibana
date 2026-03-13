/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef, type PropsWithChildren } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { useKibana } from '../common/hooks/use_kibana';
import { AIV2TelemetryEventType } from '../../common';

type ReportIntegrationInstalled = (params: {
  integrationName: string;
  version: string;
  dataStreamCount: number;
  dataStreamNames: string[];
  processorCount: number;
  processorTypes: string[];
}) => void;

interface TelemetryContextProps {
  sessionId: string;
  reportIntegrationInstalled: ReportIntegrationInstalled;
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

  const reportIntegrationInstalled = useCallback<ReportIntegrationInstalled>(
    ({
      integrationName,
      version,
      dataStreamCount,
      dataStreamNames,
      processorCount,
      processorTypes,
    }) => {
      telemetry?.reportEvent(AIV2TelemetryEventType.IntegrationInstalled, {
        sessionId: sessionData.current.sessionId,
        integrationName,
        version,
        dataStreamCount,
        dataStreamNames,
        processorCount,
        processorTypes,
      });
    },
    [telemetry]
  );

  const value = useMemo<TelemetryContextProps>(
    () => ({
      sessionId: sessionData.current.sessionId,
      reportIntegrationInstalled,
    }),
    [reportIntegrationInstalled]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
});
TelemetryContextProvider.displayName = 'TelemetryContextProvider';
