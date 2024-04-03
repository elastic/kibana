/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HttpHandler } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { TelemetryEvents } from '../../types';

interface DataQualityProviderProps {
  httpFetch: HttpHandler;
  isILMAvailable: boolean;
  telemetryEvents: TelemetryEvents;
  toasts: IToasts;
}

const DataQualityContext = React.createContext<DataQualityProviderProps | undefined>(undefined);

export const DataQualityProvider: React.FC<DataQualityProviderProps> = ({
  children,
  httpFetch,
  toasts,
  isILMAvailable,
  telemetryEvents,
}) => {
  const value = useMemo(
    () => ({
      httpFetch,
      toasts,
      isILMAvailable,
      telemetryEvents,
    }),
    [httpFetch, toasts, isILMAvailable, telemetryEvents]
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
