/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';

/** The error type to report in an EBT payload. */
export const errorTypeForTelemetry = (error: unknown): string => {
  if (error instanceof ExecutionError) {
    return error.type;
  }
  return error instanceof Error ? error.name : 'unknown';
};
