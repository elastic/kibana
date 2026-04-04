/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

interface LayoutContextValue {
  isCondensed: boolean;
  setIsCondensed: (value: boolean) => void;
  toggleCondensed: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const LayoutContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCondensed, setIsCondensedState] = useState(false);

  const setIsCondensed = useCallback((value: boolean) => {
    setIsCondensedState(value);
  }, []);

  const toggleCondensed = useCallback(() => {
    setIsCondensedState((v) => !v);
  }, []);

  return (
    <LayoutContext.Provider value={{ isCondensed, setIsCondensed, toggleCondensed }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = (): LayoutContextValue => {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayoutContext must be used within LayoutContextProvider');
  }
  return ctx;
};
