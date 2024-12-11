/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren, createContext, useContext } from 'react';
import type { NLPSettings } from '../../../../common/constants/app';

export interface MlServerInfoContextValue {
  // TODO add ML server info
  nlpSettings: NLPSettings;
}

export const MlServerInfoContext = createContext<MlServerInfoContextValue | undefined>(undefined);

export const MlServerInfoContextProvider: FC<PropsWithChildren<MlServerInfoContextValue>> = ({
  children,
  nlpSettings,
}) => {
  return (
    <MlServerInfoContext.Provider
      value={{
        nlpSettings,
      }}
    >
      {children}
    </MlServerInfoContext.Provider>
  );
};

export function useMlServerInfo() {
  const context = useContext(MlServerInfoContext);
  if (context === undefined) {
    throw new Error('useMlServerInfo must be used within a MlServerInfoContextProvider');
  }
  return context;
}
