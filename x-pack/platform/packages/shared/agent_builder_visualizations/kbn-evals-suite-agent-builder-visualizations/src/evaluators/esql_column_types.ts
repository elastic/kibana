/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsqlColumn {
  name: string;
  type: string;
}

const NUMERIC_TYPES = new Set([
  'integer',
  'long',
  'double',
  'float',
  'unsigned_long',
  'number',
  'half_float',
  'scaled_float',
]);

export const isNumericColumn = (column: EsqlColumn): boolean =>
  NUMERIC_TYPES.has(column.type.toLowerCase());
