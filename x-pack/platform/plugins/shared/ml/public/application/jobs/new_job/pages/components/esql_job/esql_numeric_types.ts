/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ES|QL output column types that can be used as a numeric detector field or
 * summary count field. Shared by the query step, the detectors editor, the
 * summary count field select, and the create flow's validation so the set
 * cannot drift between call sites.
 */
export const NUMERIC_ESQL_TYPES = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'float',
  'half_float',
  'scaled_float',
  'double',
]);
