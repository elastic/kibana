/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NodeSystemError extends Error {
  hostname?: string;
  address?: string;
  code: string;
  dest: string;
  errno: number;
  info?: object;
  message: string;
  path?: string;
  port?: number;
  syscall: string;
}

export function isAggregateError(cause: unknown): cause is AggregateError {
  return cause instanceof AggregateError;
}
