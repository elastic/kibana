/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type CellFormat = 'text' | 'number' | 'date';

const asDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Formats a result value for display, in Kibana's UI language. Empty values become ''. */
export const formatValue = (value: unknown, format: CellFormat = 'text'): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => formatValue(item, format)).join(', ');

  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat(i18n.getLocale()).format(value);
  }
  if (format === 'date') {
    const date = asDate(value);
    if (date) {
      return new Intl.DateTimeFormat(i18n.getLocale(), {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(date);
    }
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/** The value a column sorts by: numbers and dates by magnitude, everything else as text. */
export const toSortValue = (value: unknown, format: CellFormat): string | number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (format === 'number') return typeof value === 'number' ? value : undefined;
  if (format === 'date') return asDate(value)?.getTime();
  return formatValue(value);
};
