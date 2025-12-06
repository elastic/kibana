/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { TimeRange } from '@kbn/es-query';

export interface ESQLQueryResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

export interface ESQLQueryState {
  loading: boolean;
  error: string | null;
  results: ESQLQueryResult | null;
}

export function useESQLQuery() {
  const {
    services: { data },
  } = useKibana();
  const [state, setState] = useState<ESQLQueryState>({
    loading: false,
    error: null,
    results: null,
  });

  const executeQuery = useCallback(
    async (query: string, timeRange?: TimeRange): Promise<ESQLQueryResult | null> => {
      if (!query || !query.trim()) {
        setState({ loading: false, error: 'Query is empty', results: null });
        return null;
      }

      setState({ loading: true, error: null, results: null });

      try {
        const searchParams: any = {
          params: {
            query,
          },
        };

        // Add time range filter if provided
        if (timeRange) {
          searchParams.params.filter = {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          };
        }

        const result = await lastValueFrom(
          data.search.search(searchParams, {
            strategy: 'esql_async',
          })
        );

        const rawResponse = result.rawResponse as any;

        if (rawResponse.columns && rawResponse.values) {
          const queryResult: ESQLQueryResult = {
            columns: rawResponse.columns.map((col: any) => ({
              name: col.name,
              type: col.type,
            })),
            values: rawResponse.values || [],
          };
          setState({
            loading: false,
            error: null,
            results: queryResult,
          });
          return queryResult;
        } else {
          setState({
            loading: false,
            error: 'Unexpected response format',
            results: null,
          });
          return null;
        }
      } catch (error) {
        let errorMessage = 'Unknown error occurred';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          // Try to extract more meaningful error from Elasticsearch responses
          if ('body' in error && typeof error.body === 'object' && error.body !== null) {
            const body = error.body as any;
            if (body.error?.reason) {
              errorMessage = body.error.reason;
            } else if (body.message) {
              errorMessage = body.message;
            } else if (body.error?.caused_by?.reason) {
              errorMessage = body.error.caused_by.reason;
            }
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }
        
        setState({
          loading: false,
          error: errorMessage,
          results: null,
        });
        return null;
      }
    },
    [data]
  );

  return {
    ...state,
    executeQuery,
  };
}

