/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from './types';

const NEEDS_QUOTING = /[",\r\n]/;
// Leading characters that spreadsheet applications interpret as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Renders any field value as display text: scalars as-is, arrays and objects as JSON. */
export function formatValue(value: FieldValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCell(value: FieldValue | undefined): string {
  let text = formatValue(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (NEEDS_QUOTING.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serializes a header row plus data rows as RFC 4180 CSV. */
export function toCsv(
  columns: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<FieldValue | undefined>>
): string {
  const lines = [columns.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}
