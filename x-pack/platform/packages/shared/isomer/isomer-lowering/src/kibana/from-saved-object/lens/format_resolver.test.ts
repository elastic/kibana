/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatFromLensColumn } from './format_resolver';
import type { FormBasedColumn } from './types';

const columnWith = (format: unknown): FormBasedColumn => ({
  operationType: 'count',
  sourceField: 'records',
  isBucketed: false,
  dataType: 'number',
  label: 'col',
  params: { format },
});

describe('formatFromLensColumn', () => {
  it('returns undefined when no column or no format', () => {
    expect(formatFromLensColumn(undefined)).toBeUndefined();
    const noParams: FormBasedColumn = {
      operationType: 'count',
      sourceField: 'records',
      isBucketed: false,
      dataType: 'number',
      label: 'col',
    };
    expect(formatFromLensColumn(noParams)).toBeUndefined();
    expect(formatFromLensColumn(columnWith(undefined))).toBeUndefined();
  });

  it('maps `percent` to percent formatter with decimals and compact', () => {
    expect(
      formatFromLensColumn(columnWith({ id: 'percent', params: { decimals: 1, compact: true } }))
    ).toEqual({ kind: 'percent', precision: 1, compact: true });
    expect(formatFromLensColumn(columnWith({ id: 'percent', params: { decimals: 1 } }))).toEqual({
      kind: 'percent',
      precision: 1,
    });
  });

  it('maps `bytes` and `duration`', () => {
    expect(formatFromLensColumn(columnWith({ id: 'bytes', params: { decimals: 0 } }))).toEqual({
      kind: 'bytes',
      precision: 0,
    });
    expect(formatFromLensColumn(columnWith({ id: 'duration', params: { decimals: 2 } }))).toEqual({
      kind: 'duration',
      precision: 2,
    });
  });

  it('maps `number` with optional suffix to a unit', () => {
    expect(
      formatFromLensColumn(columnWith({ id: 'number', params: { decimals: 0, suffix: 'req' } }))
    ).toEqual({ kind: 'number', precision: 0, unit: 'req' });
  });

  it('inherits source-field formats and reads numeral pattern prefixes', () => {
    const column: FormBasedColumn = {
      operationType: 'sum',
      sourceField: 'taxful_total_price',
      isBucketed: false,
      dataType: 'number',
      label: 'Revenue',
    };
    expect(
      formatFromLensColumn(column, {
        taxful_total_price: {
          id: 'number',
          params: { pattern: '$0,0.[00]' },
        },
      })
    ).toEqual({ kind: 'number', precision: 2, optionalDecimals: true, prefix: '$' });
  });

  it('reads a numeral pattern suffix and fixed decimals', () => {
    expect(
      formatFromLensColumn(columnWith({ id: 'number', params: { pattern: '0,0.00 ms' } }))
    ).toEqual({ kind: 'number', precision: 2, suffix: ' ms' });
  });

  it('maps `custom` with a pattern template', () => {
    expect(
      formatFromLensColumn(
        columnWith({
          id: 'custom',
          params: { decimals: 1, pattern: '{value} req/s' },
        })
      )
    ).toEqual({ kind: 'custom', precision: 1, template: '{value} req/s' });
  });

  it('defaults precision when not provided', () => {
    expect(formatFromLensColumn(columnWith({ id: 'percent' }))).toEqual({
      kind: 'percent',
      precision: 2,
    });
  });

  it('returns undefined for unknown format ids', () => {
    expect(formatFromLensColumn(columnWith({ id: 'string' }))).toBeUndefined();
    expect(formatFromLensColumn(columnWith({ id: 'date', params: {} }))).toBeUndefined();
  });
});
