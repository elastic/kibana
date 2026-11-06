/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface LifecycleAfterSaveApi {
  refreshToken: number;
  notifyAfterSave: () => void;
}

const LifecycleAfterSaveContext = createContext<LifecycleAfterSaveApi | undefined>(undefined);

export const LifecycleAfterSaveProvider = ({ children }: { children: React.ReactNode }) => {
  const [refreshToken, setRefreshToken] = useState(0);

  const notifyAfterSave = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  const value = useMemo<LifecycleAfterSaveApi>(() => {
    return { refreshToken, notifyAfterSave };
  }, [notifyAfterSave, refreshToken]);

  return (
    <LifecycleAfterSaveContext.Provider value={value}>
      {children}
    </LifecycleAfterSaveContext.Provider>
  );
};

export const useLifecycleAfterSave = (): LifecycleAfterSaveApi => {
  const ctx = useContext(LifecycleAfterSaveContext);
  if (!ctx) {
    throw new Error('useLifecycleAfterSave must be used within a LifecycleAfterSaveProvider');
  }
  return ctx;
};
