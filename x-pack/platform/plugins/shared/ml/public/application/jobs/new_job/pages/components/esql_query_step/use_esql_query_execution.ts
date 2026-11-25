/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMlKibana } from '../../../../../contexts/kibana';
import { appendTimeFilter } from './extract_source_query';

export interface EsqlResultColumn {
  id: string;
  displayAsText: string;
  esType: string;
}

export type EsqlResultRow = Record<string, string | null>;

interface RunParams {
  query: string;
  timeField: string;
  timeRange: { from: string; to: string };
  projectRouting?: string;
}

export interface EsqlQueryExecution {
  columns: EsqlResultColumn[];
  rows: EsqlResultRow[];
  isLoading: boolean;
  error: string | null;
  hasRun: boolean;
  run: (params: RunParams) => void;
}

interface EsqlQueryResults {
  readonly columns: EsqlResultColumn[];
  readonly rows: EsqlResultRow[];
  readonly error: string | null;
}

// The latest results of each wizard, keyed by its job creator, so they are still shown when the
// user comes back to the query step. Results are dropped with the job creator.
const resultsCache = new WeakMap<object, EsqlQueryResults>();

const formatCellValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/**
 * Runs an ES|QL query over a time range on demand and keeps the latest results. The results are
 * kept for the given cache key, e.g. the wizard's job creator, and restored when the hook mounts.
 */
export const useEsqlQueryExecution = (cacheKey: object): EsqlQueryExecution => {
  const {
    services: { data },
  } = useMlKibana();
  const [cached] = useState(() => resultsCache.get(cacheKey));
  const [columns, setColumns] = useState<EsqlResultColumn[]>(cached?.columns ?? []);
  const [rows, setRows] = useState<EsqlResultRow[]>(cached?.rows ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(cached?.error ?? null);
  const [hasRun, setHasRun] = useState(cached !== undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const run = useCallback(
    async ({ query, timeField, timeRange, projectRouting }: RunParams) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setHasRun(true);
      setIsLoading(true);
      setError(null);

      let results: EsqlQueryResults;
      try {
        const { rawResponse: response } = await data.search.esql(
          {
            query: timeField ? appendTimeFilter(trimmed, timeField) : trimmed,
            dropNullColumns: true,
            projectRouting,
            kibanaQueryContext: { timeRange },
          },
          { abortSignal: abortController.signal }
        );
        if (abortController.signal.aborted) {
          return;
        }
        results = {
          columns: response.columns.map(({ name, type }) => ({
            id: name,
            displayAsText: name,
            esType: type,
          })),
          rows: response.values.map((row) =>
            Object.fromEntries(
              response.columns.map(({ name }, i) => [name, formatCellValue(row[i])])
            )
          ),
          error: null,
        };
      } catch (e) {
        if (abortController.signal.aborted) {
          return;
        }
        results = { columns: [], rows: [], error: e instanceof Error ? e.message : String(e) };
      }
      resultsCache.set(cacheKey, results);
      setColumns(results.columns);
      setRows(results.rows);
      setError(results.error);
      setIsLoading(false);
    },
    [data.search, cacheKey]
  );

  return { columns, rows, isLoading, error, hasRun, run };
};
