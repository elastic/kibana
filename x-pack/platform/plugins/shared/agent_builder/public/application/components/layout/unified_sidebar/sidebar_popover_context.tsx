/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React, { createContext, useContext } from 'react';

export interface SidebarPopoverContextValue {
  onToggleCondensed: () => void;
}

const SidebarPopoverContext = createContext<SidebarPopoverContextValue | null>(null);

export const SidebarPopoverProvider: React.FC<
  SidebarPopoverContextValue & { children: React.ReactNode }
> = ({ onToggleCondensed, children }) => {
  return (
    <SidebarPopoverContext.Provider value={{ onToggleCondensed }}>
      {children}
    </SidebarPopoverContext.Provider>
  );
};

export const useSidebarPopoverContext = (): SidebarPopoverContextValue | null =>
  useContext(SidebarPopoverContext);
