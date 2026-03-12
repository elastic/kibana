/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

interface FullscreenContextValue {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
}

const FullscreenContext = createContext<FullscreenContextValue | null>(null);

interface FullscreenProviderProps {
  children: React.ReactNode;
}

export const FullscreenProvider: React.FC<FullscreenProviderProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  return (
    <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen, exitFullscreen }}>
      {children}
    </FullscreenContext.Provider>
  );
};

const noopFullscreen: FullscreenContextValue = {
  isFullscreen: false,
  toggleFullscreen: () => {},
  exitFullscreen: () => {},
};

export const useFullscreen = (): FullscreenContextValue => {
  const context = useContext(FullscreenContext);
  // Return no-op values when used outside provider (e.g., in embeddable context)
  return context ?? noopFullscreen;
};
