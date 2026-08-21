/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves the query-generation max-steps override.
 *
 * Controlled by `KI_QUERY_GENERATION_MAX_STEPS` (1..20). Resolved once per
 * run; callers share this single resolved value for logging and execution.
 */
export const resolveMaxSteps = (
  raw = process.env.KI_QUERY_GENERATION_MAX_STEPS
): number | undefined => {
  if (raw == null || raw.trim() === '') {
    return undefined;
  }
  if (!/^(?:[1-9]|1[0-9]|20)$/.test(raw.trim())) {
    throw new Error('KI_QUERY_GENERATION_MAX_STEPS must be an integer from 1 to 20');
  }
  return Number(raw.trim());
};
