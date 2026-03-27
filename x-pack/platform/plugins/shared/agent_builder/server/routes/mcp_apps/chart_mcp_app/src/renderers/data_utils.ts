/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlData, EsqlColumn } from '../types';

/**
 * Converts columnar ES|QL data ({ columns, values }) into an array of row objects
 * keyed by column name.
 */
export const toRowObjects = (data: EsqlData): Array<Record<string, unknown>> => {
  const { columns, values } = data;
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj;
  });
};

/**
 * Looks up the column index by name.
 */
export const columnIndex = (data: EsqlData, name: string): number =>
  data.columns.findIndex((c) => c.name === name);

/**
 * Extracts a single-column array of values from ES|QL data.
 */
export const columnValues = (data: EsqlData, name: string): unknown[] => {
  const idx = columnIndex(data, name);
  if (idx === -1) return [];
  return data.values.map((row) => row[idx]);
};

/**
 * Returns the column name from an EsqlColumn spec.
 */
export const colName = (col: EsqlColumn | undefined): string => col?.column ?? '';

/**
 * Returns the display label for a column — uses `label` if set, falls back to `column`.
 */
export const colLabel = (col: EsqlColumn | undefined): string =>
  col?.label ?? col?.column ?? '';

/**
 * Finds the ES|QL column type for a given column name.
 */
export const columnType = (data: EsqlData, name: string): string | undefined => {
  const col = data.columns.find((c) => c.name === name);
  return col?.type;
};

/**
 * Returns true if the given ES|QL column type represents a date.
 */
export const isDateType = (esqlType: string | undefined): boolean =>
  esqlType === 'date' || esqlType === 'datetime';
