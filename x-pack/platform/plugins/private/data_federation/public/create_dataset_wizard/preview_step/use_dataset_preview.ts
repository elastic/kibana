/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLRow } from '@kbn/es-types';
import { formatESQLColumns, getESQLAdHocDataview } from '@kbn/esql-utils';

import type { DataFederationKibanaServices } from '../../types';

export interface DatasetPreviewResult {
  columns: ReturnType<typeof formatESQLColumns>;
  dataView: DataView;
  query: AggregateQuery;
  rows: ESQLRow[];
}

export interface DatasetPreviewState {
  isLoading: boolean;
  error?: Error;
  result?: DatasetPreviewResult;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export interface UseDatasetPreviewResult extends DatasetPreviewState {
  refresh: () => void;
}

/** Runs an ES|QL query and returns the results in the shape the ES|QL data grid renders. */
export const useDatasetPreview = (esqlQuery: string): UseDatasetPreviewResult => {
  const {
    services: { data, http },
  } = useKibana<DataFederationKibanaServices>();
  const [state, setState] = useState<DatasetPreviewState>({ isLoading: true });
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const runPreview = async () => {
      setState(({ result }) => ({ isLoading: true, result }));
      try {
        const [{ rawResponse: response }, dataView] = await Promise.all([
          data.search.esql({ query: esqlQuery, columnMetadata: true }, { abortSignal: signal }),
          getESQLAdHocDataview({
            dataViewsService: data.dataViews,
            http,
            options: { allowNoIndex: true, skipFetchFields: true },
            query: esqlQuery,
          }),
        ]);
        if (signal.aborted) {
          return;
        }
        setState({
          isLoading: false,
          result: {
            columns: formatESQLColumns(response.columns),
            dataView,
            query: { esql: esqlQuery },
            rows: response.values,
          },
        });
      } catch (error) {
        if (!signal.aborted) {
          setState({ isLoading: false, error: toError(error) });
        }
      }
    };

    runPreview();

    return () => abortController.abort();
  }, [data, http, esqlQuery, refreshCount]);

  return useMemo(() => ({ ...state, refresh }), [state, refresh]);
};
