/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tiny schema helpers shared by the main package and the validator worker
 * (the worker must not import the full dialect module).
 */

/** Whether a `$schema` URL identifies Raw Vega (not Vega-Lite). */
export const isRawVegaSchema = (schema: unknown): boolean =>
  typeof schema === 'string' &&
  schema.includes('schema/vega/') &&
  !schema.includes('schema/vega-lite/');
