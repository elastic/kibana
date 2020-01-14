/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';

export interface AlertsContextValue {
  alertFlyoutVisible: boolean;
  setAlertFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

const AlertsContext = createContext<AlertsContextValue>(null as any);

export const AlertsContextProvider = ({
  children,
  value,
}: {
  value: AlertsContextValue;
  children: React.ReactNode;
}) => {
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
};

export const useAlertsContext = () => {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error('ActionsConnectorsContext has not been set.');
  }
  return ctx;
};
