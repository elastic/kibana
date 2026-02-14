/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useExecuteQueryStreamPreview } from '../../../hooks/use_execute_query_stream_preview';

export type QueryStreamCreationState = ReturnType<typeof useExecuteQueryStreamPreview>;

const QueryStreamCreationContext = createContext<QueryStreamCreationState | null>(null);

/**
 * Provider for query stream creation state.
 * This shares preview data between the form and preview panel components.
 */
export function QueryStreamCreationProvider({ children }: { children: React.ReactNode }) {
  const { executeQuery, isLoading, error, documents } = useExecuteQueryStreamPreview();

  const value = useMemo(
    () => ({
      documents,
      error,
      isLoading,
      executeQuery,
    }),
    [documents, error, isLoading, executeQuery]
  );

  return (
    <QueryStreamCreationContext.Provider value={value}>
      {children}
    </QueryStreamCreationContext.Provider>
  );
}

/**
 * Hook to access query stream creation state.
 * Must be used within QueryStreamCreationProvider.
 */
export function useQueryStreamCreation(): QueryStreamCreationState {
  const context = useContext(QueryStreamCreationContext);
  if (!context) {
    throw new Error('useQueryStreamCreation must be used within QueryStreamCreationProvider');
  }
  return context;
}
