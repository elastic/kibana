/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatcherStageError } from './types';

/**
 * Reduce an `Error` to the log-safe `{ type, message }` shape embedded in
 * the per-tick summary. Stack traces are emitted separately at `error`
 * level by the pipeline; keeping the summary compact lets it stay queryable
 * via ES|QL without blowing up log sizes on repeated failures.
 */
export function toStageError(error: Error): DispatcherStageError {
  return {
    type: error.name || 'Error',
    message: error.message,
  };
}
