/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SampleDocument } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from './use_kibana';
import { esqlResultToPlainObjects } from '../util/esql_result_to_plain_objects';
import { executeEsqlQuery } from './use_execute_esql_query';
import { useTimefilter } from './use_timefilter';

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
export function useExecuteQueryStreamPreview() {
  const { data } = useKibana().dependencies.start;
  const { timeState } = useTimefilter();

  const [{ value: documents, error, loading: isLoading }, executeQuery] = useAsyncFn(
    async (esqlQuery: string) => {
      const limitedQuery = esqlQuery.concat(' | limit 100');
      const result = await executeEsqlQuery({
        query: limitedQuery,
        search: data.search.search,
        start: timeState.start,
        end: timeState.end,
      });

      return esqlResultToPlainObjects<SampleDocument>(result);
    },
    [data.search.search, timeState.start, timeState.end]
  );

  return {
    executeQuery,
    isLoading,
    error,
    documents,
  };
}
