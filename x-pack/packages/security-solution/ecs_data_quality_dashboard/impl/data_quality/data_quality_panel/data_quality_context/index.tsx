/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import React, { useMemo } from 'react';
import { TelemetryEvents } from '../../types';

interface DataQualityProviderProps {
  httpFetch: HttpHandler;
  isILMAvailable: boolean;
  telemetryEvents: TelemetryEvents;
}

const DataQualityContext = React.createContext<DataQualityProviderProps | undefined>(undefined);

export const DataQualityProvider: React.FC<DataQualityProviderProps> = ({
  children,
  httpFetch,
  isILMAvailable,
  telemetryEvents,
}) => {
  const value = useMemo(
    () => ({
      httpFetch,
      isILMAvailable,
      telemetryEvents,
    }),
    [httpFetch, isILMAvailable, telemetryEvents]
  );

  return <DataQualityContext.Provider value={value}>{children}</DataQualityContext.Provider>;
};

export const useDataQualityContext = () => {
  const context = React.useContext(DataQualityContext);

  if (context == null) {
    throw new Error('useDataQualityContext must be used within a DataQualityProvider');
  }

  return context;
};
