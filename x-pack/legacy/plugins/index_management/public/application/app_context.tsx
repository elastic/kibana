/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';

import { IndexMgmtMetricsType } from '../types';
import { UiMetricService } from './services';
import { ExtensionsService } from '../services';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  services: {
    uiMetric: UiMetricService<IndexMgmtMetricsType>;
    extensions: ExtensionsService;
  };
}

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDependencies;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const AppContextConsumer = AppContext.Consumer;

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};

export const useServices = () => useAppContext().services;
