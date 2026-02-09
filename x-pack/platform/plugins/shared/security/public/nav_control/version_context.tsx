/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { BehaviorSubject } from 'rxjs';

export type UIVersion = 'current' | '1.1' | '1.2';

interface VersionContextValue {
  version: UIVersion;
  setVersion: (version: UIVersion) => void;
  version$: BehaviorSubject<UIVersion>;
}

const VersionContext = createContext<VersionContextValue | undefined>(undefined);

const VERSION_STORAGE_KEY = 'kibana_ui_version';

// Global version observable for services that need to react to version changes
const getInitialVersion = (): UIVersion => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(VERSION_STORAGE_KEY);
    if (stored === 'current' || stored === '1.1' || stored === '1.2') {
      return stored as UIVersion;
    }
  }
  return 'current';
};

// Global observable for version changes
export const version$ = new BehaviorSubject<UIVersion>(getInitialVersion());

export const VersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [version, setVersionState] = useState<UIVersion>(getInitialVersion());

  useEffect(() => {
    version$.next(version);
  }, [version]);

  const setVersion = useCallback((newVersion: UIVersion) => {
    setVersionState(newVersion);
    version$.next(newVersion);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
    }
  }, []);

  return (
    <VersionContext.Provider value={{ version, setVersion, version$ }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = (): VersionContextValue => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};
