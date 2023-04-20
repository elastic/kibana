/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { createContext, useContext } from 'react';
import type { Tracker } from '../types';

interface TelemetryProviderProps {
  tracker?: Tracker;
}

const TelemetryContext = createContext<{ tracker?: Tracker } | null>(null);

export const TelemetryContextProvider: FC<TelemetryProviderProps> = ({ children, tracker }) => {
  return <TelemetryContext.Provider value={{ tracker }}>{children}</TelemetryContext.Provider>;
};

export const useTelemetryContext = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('No TelemetryContext found.');
  }
  return context;
};
