/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getESQLResults } from '@kbn/esql-utils';
import { useMlKibana } from '../../../../../contexts/kibana';
import { injectTimeFilter } from './extract_source_query';

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

const formatCellValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/** Runs an ES|QL query over a time range on demand and keeps the latest results. */
export const useEsqlQueryExecution = (): EsqlQueryExecution => {
  const {
    services: { data },
  } = useMlKibana();
  const [columns, setColumns] = useState<EsqlResultColumn[]>([]);
  const [rows, setRows] = useState<EsqlResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
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

      try {
        const { response } = await getESQLResults({
          esqlQuery: timeField ? injectTimeFilter(trimmed, timeField) : trimmed,
          search: data.search.search,
          signal: abortController.signal,
          dropNullColumns: true,
          timeRange,
          projectRouting,
        });
        if (abortController.signal.aborted) {
          return;
        }
        setColumns(
          response.columns.map(({ name, type }) => ({
            id: name,
            displayAsText: name,
            esType: type,
          }))
        );
        setRows(
          response.values.map((row) =>
            Object.fromEntries(
              response.columns.map(({ name }, i) => [name, formatCellValue(row[i])])
            )
          )
        );
      } catch (e) {
        if (abortController.signal.aborted) {
          return;
        }
        setColumns([]);
        setRows([]);
        setError(e instanceof Error ? e.message : String(e));
      }
      setIsLoading(false);
    },
    [data.search.search]
  );

  return { columns, rows, isLoading, error, hasRun, run };
};
