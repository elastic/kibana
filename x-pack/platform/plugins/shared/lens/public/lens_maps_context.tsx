/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import type { DatasourceMap, VisualizationMap } from './types';

interface LensMapsContextValue {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
}

const LensMapsContext = createContext<LensMapsContextValue | undefined>(undefined);

export interface LensMapsProviderProps {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  children: ReactNode;
}

/**
 * Provider component that makes visualizationMap and datasourceMap available
 * throughout the component tree via React context.
 *
 * This should be added at the root of:
 * - Full-page Lens editor
 * - Inline edit configuration flyout
 * - Embeddable component
 */
export function LensMapsProvider({
  visualizationMap,
  datasourceMap,
  children,
}: LensMapsProviderProps) {
  return (
    <LensMapsContext.Provider value={{ visualizationMap, datasourceMap }}>
      {children}
    </LensMapsContext.Provider>
  );
}

/**
 * Hook to access visualizationMap and datasourceMap from context.
 *
 * @throws Error if used outside of LensMapsProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { visualizationMap, datasourceMap } = useLensMaps();
 *   const activeViz = visualizationMap[activeId];
 *   // ...
 * }
 * ```
 */
export function useLensMaps(): LensMapsContextValue {
  const context = useContext(LensMapsContext);
  if (!context) {
    throw new Error('useLensMaps must be used within a LensMapsProvider');
  }
  return context;
}
