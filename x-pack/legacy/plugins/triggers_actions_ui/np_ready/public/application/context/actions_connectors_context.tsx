/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { ActionType } from '../../types';

export interface ActionsConnectorsContextValue {
  addFlyoutVisible: boolean;
  editFlyoutVisible: boolean;
  setEditFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  setAddFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
  actionTypesIndex: Record<string, ActionType> | undefined;
  reloadConnectors: () => Promise<void>;
}

const ActionsConnectorsContext = createContext<ActionsConnectorsContextValue>(null as any);

export const ActionsConnectorsContextProvider = ({
  children,
  value,
}: {
  value: ActionsConnectorsContextValue;
  children: React.ReactNode;
}) => {
  return (
    <ActionsConnectorsContext.Provider value={value}>{children}</ActionsConnectorsContext.Provider>
  );
};

export const useActionsConnectorsContext = () => {
  const ctx = useContext(ActionsConnectorsContext);
  if (!ctx) {
    throw new Error('ActionsConnectorsContext has not been set.');
  }
  return ctx;
};
