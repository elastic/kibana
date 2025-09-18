/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface TourManagerContextType {
  activeTour: string | null;
  setActiveTour: (tourId: string | null) => void;
}

const TourManagerContext = createContext<TourManagerContextType | null>(null);

export const TourManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTour, setActiveTour] = useState<string | null>(null);

  return (
    <TourManagerContext.Provider value={{ activeTour, setActiveTour }}>
      {children}
    </TourManagerContext.Provider>
  );
};

/**
 * Hook to manage tour coordination across Fleet components.
 * Ensures only one tour is displayed at a time to prevent overlap.
 */
export const useTourManager = () => {
  const context = useContext(TourManagerContext);
  if (!context) {
    // Fallback behavior when context is not available
    return {
      activeTour: null,
      setActiveTour: () => {},
    };
  }
  return context;
};
