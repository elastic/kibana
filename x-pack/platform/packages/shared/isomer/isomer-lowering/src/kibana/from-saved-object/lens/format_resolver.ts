/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValueFormatter } from '../../model/formatter';

import type { FormBasedColumn } from './types';

// Resolve a Kibana column's stored format hint (`params.format`) into an
// Adaptive `ValueFormatter` so the binder can render numeric values the way
// the dashboard author intended (percentages, bytes, durations, …).
//
// Kibana stores formats per column as:
//
//   params: {
//     format: {
//       id: 'percent' | 'number' | 'bytes' | 'duration' | 'string' | …,
//       params?: {
//         decimals?: number,
//         suffix?: string,
//         pattern?: string,
//         fromUnit?: string,     // duration: input unit
//         toUnit?: string,       // duration: display unit
//         compact?: boolean,
//       }
//     }
//   }
//
// We intentionally cover only the subset that maps cleanly onto our
// formatter primitives. Anything we don't understand returns `undefined`
// so the binder falls back to a plain numeric render; callers can layer a
// diagnostic in their own path if richer feedback is wanted.

export interface LensColumnFormat {
  id?: string;
  params?: {
    decimals?: number;
    suffix?: string;
    pattern?: string;
    fromUnit?: string;
    toUnit?: string;
    compact?: boolean;
  };
}

/**
 * Read a Lens column's `params.format` and translate it into a
 * `ValueFormatter`. Returns `undefined` when no usable format is present
 * (e.g. the column is a string or the format id isn't one we handle yet).
 */
export const formatFromLensColumn = (
  column: FormBasedColumn | undefined,
  fieldFormats?: Record<string, LensColumnFormat>
): ValueFormatter | undefined => {
  if (!column) {
    return undefined;
  }
  const raw = (column.params as { format?: LensColumnFormat } | undefined)?.format;
  const fallback =
    raw === undefined && column.sourceField ? fieldFormats?.[column.sourceField] : undefined;
  const format = raw ?? fallback;
  if (!format) {
    return undefined;
  }
  return kibanaFormatToValueFormatter(format);
};

/**
 * Translate a raw Kibana format hint (as stored on textBased columns'
 * `params.format`) into a {@link ValueFormatter}. Sibling to
 * {@link formatFromLensColumn} for callers that already hold the format.
 */
export const formatFromRawLensFormat = (
  raw: LensColumnFormat | undefined
): ValueFormatter | undefined => (raw ? kibanaFormatToValueFormatter(raw) : undefined);

const precisionFromPattern = (pattern: string | undefined): number | undefined => {
  if (!pattern) {
    return undefined;
  }
  const decimal = pattern.match(/\.(?:\[([0#]+)\]|([0#]+))/);
  if (!decimal) {
    return undefined;
  }
  return (decimal[1] ?? decimal[2] ?? '').length;
};

const prefixFromPattern = (pattern: string | undefined): string | undefined => {
  if (!pattern) {
    return undefined;
  }
  const match = pattern.match(/^[^0#,.[]+/);
  return match?.[0] || undefined;
};

const optionalDecimalsInPattern = (pattern: string | undefined): boolean =>
  /\.\[[0#]+\]/.test(pattern ?? '');

const suffixFromPattern = (pattern: string | undefined): string | undefined => {
  const match = pattern?.match(/[0#\]][^0#\]]+$/);
  return match?.[0].slice(1) || undefined;
};

const kibanaFormatToValueFormatter = (raw: LensColumnFormat): ValueFormatter | undefined => {
  const params = raw.params ?? {};
  const precision =
    typeof params.decimals === 'number'
      ? params.decimals
      : precisionFromPattern(params.pattern) ?? 2;
  const compact = params.compact === true ? { compact: true } : {};
  const prefix = prefixFromPattern(params.pattern);
  const suffix = suffixFromPattern(params.pattern);
  const optional =
    typeof params.decimals !== 'number' && optionalDecimalsInPattern(params.pattern)
      ? { optionalDecimals: true }
      : {};

  switch (raw.id) {
    case 'percent':
      return { kind: 'percent', precision, ...optional, ...compact };
    case 'bytes':
      return { kind: 'bytes', precision };
    case 'duration':
      return { kind: 'duration', precision };
    case 'number':
      return {
        kind: 'number',
        precision,
        ...(prefix ? { prefix } : {}),
        ...(suffix ? { suffix } : {}),
        ...(params.suffix ? { unit: params.suffix } : {}),
        ...optional,
        ...compact,
      };
    case 'custom':
      // Lens `custom` formats supply a `pattern` like `'{value} req/s'`.
      // We pass it straight through; `formatValue` does the substitution.
      return {
        kind: 'custom',
        precision,
        ...(params.pattern ? { template: params.pattern } : {}),
      };
    // `string` / `boolean` / `date` are non-numeric — no formatter needed;
    // the binder will treat raw cells as labels. Same story for any new
    // id we haven't taught the converter yet.
    default:
      return undefined;
  }
};
