/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { Parser } from '@elastic/esql';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export interface QueryColumn extends EuiDataGridColumn {
  esType: string;
}

export interface QueryExecutionResult {
  columns: QueryColumn[];
  rows: Array<Record<string, string | null>>;
  totalRowCount: number;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  run: () => void;
  hasRun: boolean;
  /** The query that was last explicitly executed — use this for the chart to avoid auto-refresh on keystrokes. */
  lastExecutedQuery: string | null;
}

interface TimeRange {
  from: string;
  to: string;
}

interface UseQueryExecutionParams {
  query: string;
  timeField: string;
  timeRange: TimeRange;
  data: DataPublicPluginStart;
}

function formatCellValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function injectTimeFilter(query: string, timeField: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  try {
    const { root } = Parser.parse(trimmed);
    const fromCmd = root.commands.find((c) => c.name === 'from' || c.name === 'ts');
    if (!fromCmd) return trimmed;

    // Insert the WHERE clause immediately after the FROM command using its AST location.
    // This is immune to pipes inside index names or string literals, unlike regex-based splitting.
    const before = trimmed.slice(0, fromCmd.location.max + 1).trimEnd();
    const after = trimmed.slice(fromCmd.location.max + 1).trimStart();
    const whereClause = `| WHERE ${timeField} >= ?_tstart AND ${timeField} <= ?_tend`;
    return after ? `${before}\n${whereClause}\n${after}` : `${before}\n${whereClause}`;
  } catch {
    return trimmed;
  }
}

export const useQueryExecution = ({
  query,
  timeField,
  timeRange,
  data,
}: UseQueryExecutionParams): QueryExecutionResult => {
  const queryClient = useQueryClient();
  const [executionQuery, setExecutionQuery] = useState<string | null>(null);
  const [executionTimeRange, setExecutionTimeRange] = useState<TimeRange | null>(null);
  const [executionTimeField, setExecutionTimeField] = useState<string | null>(null);

  const canExecute = Boolean(executionQuery?.trim() && executionTimeField?.trim());

  const fetchResults = useCallback(async () => {
    if (!executionQuery || !executionTimeRange || !executionTimeField) {
      return { columns: [], values: [] };
    }

    const queryWithTime = injectTimeFilter(executionQuery, executionTimeField);

    const result = await getESQLResults({
      esqlQuery: queryWithTime,
      search: data.search.search,
      dropNullColumns: true,
      timeRange: executionTimeRange,
    });

    return result.response;
  }, [executionQuery, executionTimeRange, executionTimeField, data.search.search]);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['composeDiscoverQuery', executionQuery, executionTimeRange, executionTimeField],
    queryFn: fetchResults,
    enabled: canExecute,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Refs ensure run() always reads the latest param values, avoiding stale
  // closures when the user switches tabs and immediately clicks Run.
  const paramsRef = useRef({ query, timeField, timeRange });
  paramsRef.current = { query, timeField, timeRange };

  const execRef = useRef({
    query: executionQuery,
    timeRange: executionTimeRange,
    timeField: executionTimeField,
  });
  execRef.current = {
    query: executionQuery,
    timeRange: executionTimeRange,
    timeField: executionTimeField,
  };

  const run = useCallback(() => {
    const { query: q, timeField: tf, timeRange: tr } = paramsRef.current;
    const exec = execRef.current;
    const trimmed = q.trim();
    if (!trimmed) return;

    const rangeChanged = exec.timeRange?.from !== tr.from || exec.timeRange?.to !== tr.to;
    const fieldChanged = exec.timeField !== tf;
    if (trimmed === exec.query && !rangeChanged && !fieldChanged) {
      queryClient.invalidateQueries({ queryKey: ['composeDiscoverQuery'] });
    } else {
      setExecutionQuery(trimmed);
      setExecutionTimeRange({ ...tr });
      setExecutionTimeField(tf);
    }
  }, [queryClient]);

  const columns: QueryColumn[] = useMemo(
    () =>
      (response?.columns ?? []).map((col) => ({
        id: col.name,
        displayAsText: col.name,
        esType: col.type,
      })),
    [response?.columns]
  );

  const { rows, totalRowCount } = useMemo(() => {
    const allRows = (response?.values ?? []).map((row) => {
      const record: Record<string, string | null> = {};
      (response?.columns ?? []).forEach((col, idx) => {
        record[col.name] = formatCellValue(row[idx]);
      });
      return record;
    });
    return { rows: allRows, totalRowCount: allRows.length };
  }, [response?.columns, response?.values]);

  const errorMessage = isError && error instanceof Error ? error.message : null;

  return {
    columns,
    rows,
    totalRowCount,
    isLoading: canExecute && isLoading,
    isError,
    error: errorMessage,
    run,
    hasRun: executionQuery !== null,
    lastExecutedQuery: executionQuery,
  };
};
