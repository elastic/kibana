/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { SampleDocument } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { esqlResultToPlainObjects } from '../util/esql_result_to_plain_objects';
import { executeEsqlQuery } from './use_execute_esql_query';
import { useTimefilter } from './use_timefilter';

export interface UseExecuteQueryStreamPreviewResult {
  /**
   * Execute an ES|QL query and return the preview documents
   */
  executeQuery: (esqlQuery: string) => Promise<void>;
  /**
   * Whether a query is currently being executed
   */
  isLoading: boolean;
  /**
   * Error from the last query execution, if any
   */
  error: Error | undefined;
  /**
   * Documents returned from the last successful query execution
   */
  documents: SampleDocument[] | undefined;
  /**
   * Clear the current error
   */
  clearError: () => void;
  /**
   * Clear the current documents
   */
  clearDocuments: () => void;
}

/**
 * Hook for executing ES|QL queries to preview query stream results.
 * This hook manages the loading state, error handling, and document storage
 * for query stream previews.
 *
 * @example
 * ```tsx
 * const { executeQuery, isLoading, error, documents } = useExecuteQueryStreamPreview();
 *
 * const handleQueryChange = async (query: string) => {
 *   await executeQuery(query);
 * };
 *
 * return (
 *   <div>
 *     {isLoading && <Spinner />}
 *     {error && <ErrorMessage error={error} />}
 *     {documents && <DocumentsTable documents={documents} />}
 *   </div>
 * );
 * ```
 */
export function useExecuteQueryStreamPreview(): UseExecuteQueryStreamPreviewResult {
  const { dependencies } = useKibana();
  const { data } = dependencies.start;
  const { timeState } = useTimefilter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [documents, setDocuments] = useState<SampleDocument[] | undefined>();

  const executeQuery = useCallback(
    async (esqlQuery: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await executeEsqlQuery({
          esqlQuery,
          data,
          timeRange: {
            from: timeState.start,
            to: timeState.end,
          },
        });

        const plainObjects = esqlResultToPlainObjects(result);
        setDocuments(plainObjects);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setDocuments(undefined);
      } finally {
        setIsLoading(false);
      }
    },
    [data, timeState.start, timeState.end]
  );

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  const clearDocuments = useCallback(() => {
    setDocuments(undefined);
  }, []);

  return {
    executeQuery,
    isLoading,
    error,
    documents,
    clearError,
    clearDocuments,
  };
}

