/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DownsampleExpressionFunction } from '../../defs/downsample/types';
import { lttbMultiMetric } from './lttb';

export const downsampleFn: DownsampleExpressionFunction['fn'] = (input, args) => {
  const { targetPoints } = args;

  if (!targetPoints || targetPoints <= 0 || input.rows.length <= targetPoints) {
    return input;
  }

  const xCol = input.columns.find((c) => c.meta.type === 'date');
  if (!xCol) {
    return input;
  }

  const numericCols = input.columns.filter(
    (c) => c.id !== xCol.id && (c.meta.type === 'number' || c.meta.type === 'date')
  );

  const sortedRows = [...input.rows].sort((a, b) => {
    const aVal = a[xCol.id];
    const bVal = b[xCol.id];
    if (aVal == null) return -1;
    if (bVal == null) return 1;
    return Number(aVal) - Number(bVal);
  });

  const xValues = sortedRows.map((row) => Number(row[xCol.id]) || 0);
  const yColumns = numericCols.map((col) => sortedRows.map((row) => Number(row[col.id]) || 0));

  const keptIndices = lttbMultiMetric(xValues, yColumns, targetPoints);

  return {
    ...input,
    rows: keptIndices.map((i) => sortedRows[i]),
  } as Datatable;
};
