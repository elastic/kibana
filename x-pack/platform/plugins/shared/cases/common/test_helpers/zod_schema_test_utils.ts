/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from '@kbn/zod/v4';

/**
 * Parses a value against a Zod schema and returns the list of validation error messages.
 * Returns an empty array when the value is valid.
 */
export const parseErrors = (schema: ZodType<unknown>, value: unknown): string[] => {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((i) => i.message);
};
