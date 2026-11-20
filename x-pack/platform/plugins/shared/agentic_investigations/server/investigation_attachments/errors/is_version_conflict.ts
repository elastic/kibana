/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Elasticsearch rejected a write because `op_type: create` or the `if_seq_no` check lost. */
export const isVersionConflict = (error: unknown): boolean => {
  const candidate = error as { statusCode?: number; meta?: { statusCode?: number } } | undefined;
  return (candidate?.statusCode ?? candidate?.meta?.statusCode) === 409;
};
