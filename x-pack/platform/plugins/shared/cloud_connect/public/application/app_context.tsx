/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';

export interface CloudConnectedAppContextValue {
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  notifications: CoreStart['notifications'];
  history: AppMountParameters['history'];
}

const CloudConnectedAppContext = createContext<CloudConnectedAppContextValue | null>(null);

export const CloudConnectedAppContextProvider: React.FC<{
  value: CloudConnectedAppContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <CloudConnectedAppContext.Provider value={value}>{children}</CloudConnectedAppContext.Provider>
  );
};

export const useCloudConnectedAppContext = () => {
  const context = useContext(CloudConnectedAppContext);
  if (!context) {
    throw new Error(
      'useCloudConnectedAppContext must be used within CloudConnectedAppContextProvider'
    );
  }
  return context;
};
