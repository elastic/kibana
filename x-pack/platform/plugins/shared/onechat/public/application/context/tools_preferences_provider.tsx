/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const INCLUDE_SYSTEM_TOOLS_KEY = 'onechat:tools:includeSystemTools';

export interface ToolsPreferencesContextType {
  includeSystemTools: boolean;
  setIncludeSystemTools: (includeSystemTools: boolean) => void;
}

export const ToolsPreferencesContext = createContext<ToolsPreferencesContextType | undefined>(
  undefined
);

export const ToolsPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [includeSystemTools = true, setIncludeSystemTools] = useLocalStorage(
    INCLUDE_SYSTEM_TOOLS_KEY,
    true
  );
  return (
    <ToolsPreferencesContext.Provider value={{ includeSystemTools, setIncludeSystemTools }}>
      {children}
    </ToolsPreferencesContext.Provider>
  );
};

export const useToolsPreferences = () => {
  const context = useContext(ToolsPreferencesContext);
  if (!context) {
    throw new Error('useToolsPreferences must be used within a ToolsPreferencesProvider');
  }
  return context;
};
