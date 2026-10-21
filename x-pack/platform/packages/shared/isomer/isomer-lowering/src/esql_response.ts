/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValueFormatter } from './kibana/model/formatter';

export interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

export type ExecuteEsql = (esql: string) => Promise<EsqlResponse>;

/** `POST /<index>/_search`, resolving to the raw response. */
export type ExecuteSearch = (index: string, body: Record<string, unknown>) => Promise<unknown>;

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const formatBytes = (value: number, precision: number): string => {
  let scaled = value;
  let unit = 0;
  while (Math.abs(scaled) >= 1024 && unit < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  return `${scaled.toFixed(unit === 0 ? 0 : precision)} ${BYTE_UNITS[unit]}`;
};

const formatNumber = (
  value: number,
  precision: number | undefined,
  compact: boolean | undefined
): string =>
  new Intl.NumberFormat('en-US', {
    ...(compact ? { notation: 'compact' as const } : {}),
    maximumFractionDigits: precision ?? 2,
    ...(precision === undefined ? {} : { minimumFractionDigits: precision }),
  }).format(value);

/** A number as the panel's Lens format shows it; `undefined` format leaves it a number. */
export const formatValue = (value: number, format: ValueFormatter | undefined): string | number => {
  if (!format) {
    return Math.round(value * 100) / 100;
  }
  const { kind, precision, prefix = '', unit, template, compact } = format;
  const text =
    kind === 'bytes'
      ? formatBytes(value, precision ?? 1)
      : kind === 'percent'
      ? `${formatNumber(value * 100, precision ?? 1, compact)}%`
      : formatNumber(value, precision, compact);
  const withUnit = `${prefix}${text}${unit ? ` ${unit}` : ''}`;
  return kind === 'custom' && template ? template.replace('{value}', withUnit) : withUnit;
};

/** A cell as Lens would show it: formatted when the column has a format, other numbers rounded to two places. */
export const tableCell = (value: unknown, format: ValueFormatter | undefined): string | number => {
  if (value === null || value === undefined) {
    return '';
  }
  return typeof value === 'number' ? formatValue(value, format) : String(value);
};

/** A column of an ES|QL response by name; throws naming the columns it has. */
export const columnIndex = (response: EsqlResponse, name: string): number => {
  const index = response.columns.findIndex((column) => column.name === name);
  if (index < 0) {
    throw new Error(
      `column ${name} is not in the response (${response.columns.map((c) => c.name).join(', ')})`
    );
  }
  return index;
};
