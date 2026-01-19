/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import type { VisualizationMap, DatasourceMap } from '@kbn/lens-common';

export interface EditorFrameServiceValue {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
}

const EditorFrameServiceContext = createContext<EditorFrameServiceValue | undefined>(undefined);

export interface EditorFrameServiceProviderProps extends EditorFrameServiceValue {
  children?: ReactNode;
}

/**
 * Provider component that makes visualizationMap and datasourceMap available
 * throughout the component tree via React context.
 *
 * This provides the same values returned by plugin.initEditorFrameService().
 *
 * This should be added at the root of:
 * - Full-page Lens editor
 * - Inline edit configuration flyout
 * - Embeddable component
 */
export function EditorFrameServiceProvider({
  visualizationMap,
  datasourceMap,
  children,
}: EditorFrameServiceProviderProps) {
  return (
    <EditorFrameServiceContext.Provider value={{ visualizationMap, datasourceMap }}>
      {children}
    </EditorFrameServiceContext.Provider>
  );
}

/**
 * Hook to access visualizationMap and datasourceMap from context.
 *
 * Returns the same values as plugin.initEditorFrameService().
 *
 * @throws Error if used outside of EditorFrameServiceProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { visualizationMap, datasourceMap } = useEditorFrameService();
 *   const activeViz = visualizationMap[activeId];
 *   // ...
 * }
 * ```
 */
export function useEditorFrameService(): EditorFrameServiceValue {
  const context = useContext(EditorFrameServiceContext);
  if (!context) {
    throw new Error('useEditorFrameService must be used within an EditorFrameServiceProvider');
  }
  return context;
}
