/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { SampleDocument } from '@kbn/streams-schema';
import { useExecuteQueryStreamPreview } from '../../../hooks/use_execute_query_stream_preview';

export interface QueryStreamCreationState {
  documents: SampleDocument[] | undefined;
  documentsError: Error | undefined;
  isLoading: boolean;
  executeQuery: (esqlQuery: string) => Promise<void>;
  clearDocuments: () => void;
  clearError: () => void;
}

const QueryStreamCreationContext = createContext<QueryStreamCreationState | null>(null);

/**
 * Provider for query stream creation state.
 * This shares preview data between the form and preview panel components.
 */
export function QueryStreamCreationProvider({ children }: { children: React.ReactNode }) {
  const { executeQuery, isLoading, error, documents, clearError, clearDocuments } =
    useExecuteQueryStreamPreview();

  const value = useMemo(
    () => ({
      documents,
      documentsError: error,
      isLoading,
      executeQuery,
      clearDocuments,
      clearError,
    }),
    [documents, error, isLoading, executeQuery, clearDocuments, clearError]
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

/**
 * Hook to safely access query stream creation state.
 * Returns null if not within QueryStreamCreationProvider.
 */
export function useQueryStreamCreationOptional(): QueryStreamCreationState | null {
  return useContext(QueryStreamCreationContext);
}
