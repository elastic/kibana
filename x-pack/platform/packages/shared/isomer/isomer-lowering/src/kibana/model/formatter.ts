/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Value formatters describe how a numeric column in a query result should be
// rendered as a display string. The converter resolves Kibana field formatters
// (bytes, percent, duration, custom suffix) into one of these `kind`s; the
// binder applies the formatter when constructing the final ViewSpec node.

export type ValueFormatterKind = 'number' | 'bytes' | 'percent' | 'duration' | 'custom';

export interface ValueFormatter {
  kind: ValueFormatterKind;
  precision?: number;
  /**
   * Prefix placed directly before formatted numbers (e.g. `$`).
   * Mirrors common Kibana numeral patterns such as `$0,0.[00]`.
   */
  prefix?: string;
  unit?: string;
  /** Text placed directly after formatted numbers, from a numeral pattern such as `0,0 ms`. */
  suffix?: string;
  /** `precision` is a most, not an exact count, as in the numeral pattern `0,0.[00]`. */
  optionalDecimals?: boolean;
  /**
   * For `kind: 'custom'`, a template string with `{value}` placeholder.
   * Example: `'{value} req/s'`.
   */
  template?: string;
  /**
   * When `true`, format the value using compact scientific notation
   * (`13014` → `13K`, `1_500_000` → `1.5M`). Currently honoured by
   * `'number'` and `'percent'` formatters; mirrors Lens's
   * `params.compact: true`.
   */
  compact?: boolean;
}
