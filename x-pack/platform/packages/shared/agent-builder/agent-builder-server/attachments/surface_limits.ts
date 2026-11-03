/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Limits of the `@kbn/isomer-components` primitives that surface compositions use. A node over its
 * limit fails validation, and that leaves the whole attachment out, so values are clamped to them.
 */
export const SURFACE_LIMITS = {
  headerText: 200,
  contextText: 500,
  codeText: 12000,
  fieldLabel: 100,
  /** Slack shows at most 10 fields in a section. */
  fieldItems: 10,
  fieldValue: 1000,
  linkPath: 2000,
  tableCell: 500,
  /** Rows a table shows before the rest are counted. */
  tableRows: 50,
} as const;

/** `value` cut to `max` characters, with an ellipsis when it's cut. */
export const clampText = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/** `value` on one line, cut to `max` characters. */
export const toLine = (value: string, max: number): string =>
  clampText(value.replace(/\s+/g, ' ').trim(), max);

/** Whether `value` has something other than whitespace, which plain-text primitives require. */
export const hasText = (value: string | undefined): value is string =>
  value !== undefined && /\S/.test(value);
