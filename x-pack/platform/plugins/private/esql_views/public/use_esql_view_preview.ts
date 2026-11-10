/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLQueryStats } from '@kbn/esql-types';
import type { ESQLRow } from '@kbn/es-types';
import {
  formatESQLColumns,
  getESQLAdHocDataview,
  getESQLResults,
  prettifyQuery,
} from '@kbn/esql-utils';

export interface EsqlViewPreviewDependencies {
  dataViews: DataPublicPluginStart['dataViews'];
  http: HttpStart;
  search: DataPublicPluginStart['search']['search'];
}

export interface EsqlViewPreviewResult {
  columns: ReturnType<typeof formatESQLColumns>;
  dataView: DataView;
  query: AggregateQuery;
  queryStats: ESQLQueryStats;
  rows: ESQLRow[];
}

interface EsqlViewPreviewState {
  error?: Error;
  hasRun: boolean;
  isLoading: boolean;
  result?: EsqlViewPreviewResult;
}

export interface UseEsqlViewPreviewResult extends EsqlViewPreviewState {
  clearPreviewErrorIfQueryChanged: (query: string) => void;
  runPreview: (query?: AggregateQuery, editorAbortController?: AbortController) => Promise<void>;
}

interface ActiveRequest {
  abortController: AbortController;
  id: number;
}

const initialState: EsqlViewPreviewState = {
  hasRun: false,
  isLoading: false,
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const normalizeQuery = (query: string): string => {
  try {
    return prettifyQuery(query);
  } catch {
    return query.trim();
  }
};

export const useEsqlViewPreview = ({
  dataViews,
  http,
  search,
}: EsqlViewPreviewDependencies): UseEsqlViewPreviewResult => {
  const [state, setState] = useState<EsqlViewPreviewState>(initialState);
  const activeRequestRef = useRef<ActiveRequest>();
  const submittedQueryRef = useRef<string>();
  const nextRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      nextRequestIdRef.current += 1;
      const activeRequest = activeRequestRef.current;
      activeRequestRef.current = undefined;
      activeRequest?.abortController.abort();
    },
    []
  );

  const clearPreviewErrorIfQueryChanged = useCallback((query: string) => {
    const submittedQuery = submittedQueryRef.current;
    if (
      submittedQuery === undefined ||
      query === submittedQuery ||
      normalizeQuery(query) === normalizeQuery(submittedQuery)
    ) {
      return;
    }

    nextRequestIdRef.current += 1;
    const activeRequest = activeRequestRef.current;
    activeRequestRef.current = undefined;
    activeRequest?.abortController.abort();
    submittedQueryRef.current = undefined;
    setState((currentState) => ({
      ...currentState,
      error: undefined,
      isLoading: false,
    }));
  }, []);

  const runPreview = useCallback(
    async (query?: AggregateQuery, editorAbortController?: AbortController): Promise<void> => {
      const esqlQuery = query && 'esql' in query ? query.esql : undefined;
      if (!esqlQuery?.trim()) {
        return;
      }

      activeRequestRef.current?.abortController.abort();

      const requestId = ++nextRequestIdRef.current;
      const abortController = editorAbortController ?? new AbortController();
      const activeRequest = { abortController, id: requestId };
      activeRequestRef.current = activeRequest;
      submittedQueryRef.current = esqlQuery;
      const isCurrentRequest = () =>
        isMountedRef.current &&
        !abortController.signal.aborted &&
        activeRequestRef.current?.id === requestId;

      setState((currentState) => ({
        ...currentState,
        error: undefined,
        isLoading: true,
      }));

      const handleAbort = () => {
        if (isMountedRef.current && activeRequestRef.current?.id === requestId) {
          activeRequestRef.current = undefined;
          setState((currentState) => ({
            ...currentState,
            error: undefined,
            isLoading: false,
          }));
        }
      };
      abortController.signal.addEventListener('abort', handleAbort, { once: true });

      try {
        const [{ response }, dataView] = await Promise.all([
          getESQLResults({
            esqlQuery,
            includeColumnMetadata: true,
            search,
            signal: abortController.signal,
          }),
          getESQLAdHocDataview({
            dataViewsService: dataViews,
            http,
            options: { allowNoIndex: true, skipFetchFields: true },
            query: esqlQuery,
          }),
        ]);

        if (!isCurrentRequest()) {
          return;
        }

        setState({
          hasRun: true,
          isLoading: false,
          result: {
            columns: formatESQLColumns(response.columns),
            dataView,
            query: { esql: esqlQuery },
            queryStats: {
              durationInMs: response.took !== undefined ? `${response.took}ms` : undefined,
              totalDocumentsProcessed: response.documents_found,
            },
            rows: response.values,
          },
        });
      } catch (error) {
        if (isCurrentRequest()) {
          setState((currentState) => ({
            ...currentState,
            error: toError(error),
            isLoading: false,
          }));
        }
      } finally {
        abortController.signal.removeEventListener('abort', handleAbort);
        if (activeRequestRef.current?.id === requestId) {
          activeRequestRef.current = undefined;
          if (isMountedRef.current) {
            setState((currentState) => ({ ...currentState, isLoading: false }));
          }
        }
      }
    },
    [dataViews, http, search]
  );

  return {
    ...state,
    clearPreviewErrorIfQueryChanged,
    runPreview,
  };
};
