/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { Tracker } from '../types';

interface TelemetryProviderProps {
  tracker?: Tracker;
  children: React.ReactNode;
}

const TelemetryContext = createContext<{ tracker?: Tracker } | null>(null);

export const TelemetryContextProvider = ({ children, tracker }: TelemetryProviderProps) => {
  return <TelemetryContext.Provider value={{ tracker }}>{children}</TelemetryContext.Provider>;
};

export const useTelemetryContext = () => {
  return useContext(TelemetryContext) ?? {};
};
