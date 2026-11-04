/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Counts of the `@kbn/isomer-components` primitives that surface compositions keep within, since a
 * node past one fails validation, and that leaves the whole attachment out.
 */
export const SURFACE_LIMITS = {
  /** Slack shows at most 10 fields in a section. */
  fieldItems: 10,
  linkPath: 2000,
  /** Rows a table shows before the rest are counted. */
  tableRows: 50,
} as const;

/** Whether `value` has something other than whitespace, which plain-text primitives require. */
export const hasText = (value: string | undefined): value is string =>
  value !== undefined && /\S/.test(value);
