/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext, useState } from 'react';

type Store = Record<string, boolean>;

const HighlightContext = createContext<{
  store: Store;
  setStore: (id: string, value: boolean) => void;
}>(null as any);

export const HighlightContextProvider = ({ children }: { children: any }) => {
  const [store, setStore] = useState<Store>(Object.create(null));
  return (
    <HighlightContext.Provider
      value={{
        store,
        setStore: (id: string, value: boolean) => setStore({ ...store, [id]: value }),
      }}
    >
      {children}
    </HighlightContext.Provider>
  );
};

export const useHighlightContext = () => {
  const ctx = useContext(HighlightContext);
  if (ctx == null) {
    throw new Error(`useHighlightContext must be called inside HighlightContext`);
  }
  return ctx;
};
