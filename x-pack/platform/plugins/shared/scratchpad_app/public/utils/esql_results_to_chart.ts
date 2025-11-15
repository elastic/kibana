/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ESQLQueryResult } from '../hooks/use_esql_query';

export interface ChartDataPoint {
  x: number | string;
  y: number;
  [key: string]: unknown;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: ChartDataPoint[];
}

/**
 * Convert ESQL query results to chart-friendly format
 * Attempts to detect time-based or numeric data suitable for charting
 */
export function esqlResultsToChartData(
  results: ESQLQueryResult | null | undefined
): {
  series: ChartSeries[];
  canChart: boolean;
  xColumn?: string;
  yColumns?: string[];
} {
  if (!results || !results.columns || !results.values || results.values.length === 0) {
    return { series: [], canChart: false };
  }

  const columns = results.columns;
  const values = results.values;

  // Try to find a time column (common names or date types)
  const timeColumnIndex = columns.findIndex(
    (col) =>
      col.type === 'date' ||
      col.name.toLowerCase().includes('time') ||
      col.name.toLowerCase().includes('timestamp') ||
      col.name.toLowerCase() === '@timestamp'
  );

  // Find numeric columns
  const numericColumnIndices = columns
    .map((col, idx) => ({ col, idx }))
    .filter(
      ({ col }) =>
        col.type === 'long' ||
        col.type === 'double' ||
        col.type === 'integer' ||
        col.type === 'float'
    )
    .map(({ idx }) => idx);

  // If we have a time column and at least one numeric column, create time series
  if (timeColumnIndex !== -1 && numericColumnIndices.length > 0) {
    const timeColumn = columns[timeColumnIndex];
    const series: ChartSeries[] = numericColumnIndices.map((yIdx) => {
      const yColumn = columns[yIdx];
      const data: ChartDataPoint[] = values.map((row) => {
        const xValue = row[timeColumnIndex];
        const yValue = row[yIdx];

        // Convert time to timestamp if needed
        let x: number;
        if (typeof xValue === 'string') {
          const parsed = Date.parse(xValue);
          x = isNaN(parsed) ? 0 : parsed;
        } else if (typeof xValue === 'number') {
          x = xValue;
        } else {
          x = 0;
        }

        return {
          x,
          y: typeof yValue === 'number' ? yValue : parseFloat(String(yValue)) || 0,
        };
      });

      return {
        id: yColumn.name,
        name: yColumn.name,
        data,
      };
    });

    return {
      series,
      canChart: true,
      xColumn: timeColumn.name,
      yColumns: numericColumnIndices.map((idx) => columns[idx].name),
    };
  }

  // If we have at least 2 numeric columns, use first as X, others as Y
  if (numericColumnIndices.length >= 2) {
    const xIdx = numericColumnIndices[0];
    const xColumn = columns[xIdx];
    const yIndices = numericColumnIndices.slice(1);

    const series: ChartSeries[] = yIndices.map((yIdx) => {
      const yColumn = columns[yIdx];
      const data: ChartDataPoint[] = values.map((row) => ({
        x: typeof row[xIdx] === 'number' ? row[xIdx] : parseFloat(String(row[xIdx])) || 0,
        y: typeof row[yIdx] === 'number' ? row[yIdx] : parseFloat(String(row[yIdx])) || 0,
      }));

      return {
        id: yColumn.name,
        name: yColumn.name,
        data,
      };
    });

    return {
      series,
      canChart: true,
      xColumn: xColumn.name,
      yColumns: yIndices.map((idx) => columns[idx].name),
    };
  }

  return { series: [], canChart: false };
}

