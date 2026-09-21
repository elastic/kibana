/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MIN_MAX_STEPS = 2;
const MAX_MAX_STEPS = 20;

/**
 * Resolves the query-generation max-steps override.
 *
 * Controlled by `KI_QUERY_GENERATION_MAX_STEPS` (2..20).
 */
export const resolveMaxSteps = (
  raw = process.env.KI_QUERY_GENERATION_MAX_STEPS
): number | undefined => {
  if (raw == null || raw.trim() === '') {
    return undefined;
  }
  const trimmed = raw.trim();
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < MIN_MAX_STEPS || value > MAX_MAX_STEPS) {
    throw new Error(
      `KI_QUERY_GENERATION_MAX_STEPS must be an integer from ${MIN_MAX_STEPS} to ${MAX_MAX_STEPS}`
    );
  }
  return value;
};
