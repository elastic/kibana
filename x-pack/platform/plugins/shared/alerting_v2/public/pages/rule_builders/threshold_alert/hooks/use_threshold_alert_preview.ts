/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { getESQLResults } from '@kbn/esql-utils';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { EuiDataGridColumn } from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ThresholdRuleFormValues } from '../types';
import { buildEsqlQuery } from '../esql_builder';

const MAX_PREVIEW_ROWS = 100;
const DEBOUNCE_WAIT = 2000;

export interface PreviewColumn extends EuiDataGridColumn {
  esType: string;
}

export interface ThresholdPreviewResult {
  columns: PreviewColumn[];
  rows: Array<Record<string, string | null>>;
  totalRowCount: number;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  groupingFields: string[];
  uniqueGroupCount: number | null;
  hasValidQuery: boolean;
  query: string;
  timeField: string;
  lookback: string;
}

const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 5 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 60000);
};

const getTimeFilter = (timeField: string, lookback: string) => {
  const timeWindow = parseDurationToMs(lookback);
  const now = Date.now();
  const dateEnd = new Date(now).toISOString();
  const dateStart = new Date(now - timeWindow).toISOString();
  return {
    timeRange: { from: dateStart, to: dateEnd },
    timeFilter: {
      bool: {
        filter: [
          {
            range: {
              [timeField]: {
                lte: dateEnd,
                gt: dateStart,
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  };
};

const formatCellValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

interface UseThresholdPreviewParams {
  data: DataPublicPluginStart;
}

export const useThresholdAlertPreview = ({
  data,
}: UseThresholdPreviewParams): ThresholdPreviewResult => {
  const { control, getValues } = useFormContext<ThresholdRuleFormValues>();

  const indexPattern = useWatch({ control, name: 'indexPattern' });
  const timeField = useWatch({ control, name: 'timeField' }) || '@timestamp';
  const filterQuery = useWatch({ control, name: 'filterQuery' });
  const stats = useWatch({ control, name: 'stats' });
  const evaluations = useWatch({ control, name: 'evaluations' });
  const alertConditions = useWatch({ control, name: 'alertConditions' });
  const conditionOperator = useWatch({ control, name: 'conditionOperator' });
  const groupBy = useWatch({ control, name: 'groupBy' });
  const schedule = useWatch({ control, name: 'schedule' });

  const formValues = useMemo<ThresholdRuleFormValues>(
    () => ({
      ...getValues(),
      indexPattern,
      timeField,
      filterQuery,
      stats,
      evaluations,
      alertConditions,
      conditionOperator,
      groupBy,
      schedule,
    }),
    [
      getValues,
      indexPattern,
      timeField,
      filterQuery,
      stats,
      evaluations,
      alertConditions,
      conditionOperator,
      groupBy,
      schedule,
    ]
  );
  const esqlQuery = useMemo(() => buildEsqlQuery(formValues), [formValues]);
  const lookback = schedule?.lookback || '5m';
  const groupingFields = useMemo(() => groupBy ?? [], [groupBy]);

  const debouncedQuery = useDebouncedValue(esqlQuery, DEBOUNCE_WAIT);
  const canExecute = Boolean(debouncedQuery?.trim() && timeField?.trim() && lookback?.trim());

  const fetchPreview = useCallback(async () => {
    if (!canExecute) {
      return { columns: [], values: [] };
    }

    const { timeFilter, timeRange } = getTimeFilter(timeField, lookback);

    const result = await getESQLResults({
      esqlQuery: debouncedQuery,
      search: data.search.search,
      dropNullColumns: true,
      timeRange,
      filter: timeFilter,
    });

    return result.response;
  }, [canExecute, debouncedQuery, timeField, lookback, data.search.search]);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['ruleBuilderPreview', debouncedQuery, timeField, lookback],
    queryFn: fetchPreview,
    enabled: canExecute,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const activeResponse = canExecute ? response : undefined;

  const columns: PreviewColumn[] = (activeResponse?.columns ?? []).map((col) => ({
    id: col.name,
    displayAsText: col.name,
    esType: col.type,
  }));

  const allRows = (activeResponse?.values ?? []).map((row) => {
    const record: Record<string, string | null> = {};
    (activeResponse?.columns ?? []).forEach((col, idx) => {
      record[col.name] = formatCellValue(row[idx]);
    });
    return record;
  });

  const totalRowCount = allRows.length;
  const rows = allRows.slice(0, MAX_PREVIEW_ROWS);

  const uniqueGroupCount = useMemo(() => {
    if (groupingFields.length === 0 || allRows.length === 0) {
      return null;
    }
    const seen = new Set<string>();
    for (const row of allRows) {
      const key = groupingFields.map((f) => row[f] ?? '').join('|');
      seen.add(key);
    }
    return seen.size;
  }, [groupingFields, allRows]);

  const errorMessage = isError && error instanceof Error ? error.message : null;
  const isDebouncing = esqlQuery !== debouncedQuery;

  const hasValidQuery = Boolean(esqlQuery?.trim()) && canExecute;

  return {
    columns,
    rows,
    totalRowCount,
    isLoading: isDebouncing || (canExecute && isLoading),
    isError,
    error: errorMessage,
    groupingFields,
    uniqueGroupCount,
    hasValidQuery,
    query: esqlQuery,
    timeField,
    lookback,
  };
};
