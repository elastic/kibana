/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export type StreamsViewMode = 'consolidated' | 'secondaryNav';

export const STREAMS_VIEW_MODE_STORAGE_KEY = 'streams.ui.viewMode';

export const DEFAULT_STREAMS_VIEW_MODE: StreamsViewMode = 'consolidated';

function isStreamsViewMode(value: unknown): value is StreamsViewMode {
  return value === 'consolidated' || value === 'secondaryNav';
}

export interface StreamsViewModeContextValue {
  viewMode: StreamsViewMode;
  setViewMode: (mode: StreamsViewMode) => void;
}

/**
 * Standalone localStorage-backed view mode read/write. Usable both inside the
 * app context provider and from the chrome nav control, which is rendered by
 * core outside of the Streams app React tree. Both consumers share the same
 * storage key so the selection stays in sync.
 */
export function useStreamsViewModeStorage(): StreamsViewModeContextValue {
  const [storedViewMode, setStoredViewMode] = useLocalStorage<StreamsViewMode>(
    STREAMS_VIEW_MODE_STORAGE_KEY,
    DEFAULT_STREAMS_VIEW_MODE
  );

  return useMemo(
    () => ({
      viewMode: isStreamsViewMode(storedViewMode) ? storedViewMode : DEFAULT_STREAMS_VIEW_MODE,
      setViewMode: setStoredViewMode,
    }),
    [storedViewMode, setStoredViewMode]
  );
}

const StreamsViewModeContext = createContext<StreamsViewModeContextValue | null>(null);

export function StreamsViewModeProvider({ children }: { children: React.ReactNode }) {
  const value = useStreamsViewModeStorage();

  return (
    <StreamsViewModeContext.Provider value={value}>{children}</StreamsViewModeContext.Provider>
  );
}

export function useStreamsViewMode(): StreamsViewModeContextValue {
  const context = useContext(StreamsViewModeContext);
  if (!context) {
    throw new Error('useStreamsViewMode must be used within a StreamsViewModeProvider');
  }
  return context;
}
