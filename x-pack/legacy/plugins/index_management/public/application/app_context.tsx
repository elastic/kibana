/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { CoreStart } from '../../../../../../src/core/public';

import { UsageCollectionSetup } from '../../../../../../src/plugins/usage_collection/public';
import { IndexMgmtMetricsType } from '../types';
import { UiMetricService, NotificationService, HttpService } from './services';
import { ExtensionsService } from '../services';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: {
    fatalErrors: CoreStart['fatalErrors'];
  };
  plugins: {
    usageCollection: UsageCollectionSetup;
  };
  services: {
    uiMetricService: UiMetricService<IndexMgmtMetricsType>;
    extensionsService: ExtensionsService;
    httpService: HttpService;
    notificationService: NotificationService;
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
