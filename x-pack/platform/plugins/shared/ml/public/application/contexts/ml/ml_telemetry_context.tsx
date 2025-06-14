/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren, createContext, useContext } from 'react';
import type { ITelemetryClient } from '../../services/telemetry/types';

interface MlTelemetryClientContextValue {
  telemetryClient: ITelemetryClient;
}

export const MlTelemetryContext = createContext<MlTelemetryClientContextValue | undefined>(
  undefined
);

export const MlTelemetryContextProvider: FC<PropsWithChildren<MlTelemetryClientContextValue>> = ({
  children,
  telemetryClient,
}) => {
  return (
    <MlTelemetryContext.Provider value={{ telemetryClient }}>
      {children}
    </MlTelemetryContext.Provider>
  );
};

export function useMlTelemetryClient() {
  const context = useContext(MlTelemetryContext);
  if (context === undefined) {
    throw new Error('useMlTelemetryClient must be used within a MlTelemetryContextProvider');
  }
  return context;
}
