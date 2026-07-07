/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NodeSystemError extends Error {
  hostname?: string; // The hostname of the machine that triggered the error
  address?: string; // If present, the address to which a network connection failed
  code: string; // The string error code
  dest: string; // If present, the file path destination when reporting a file system error
  errno: number; // The system-provided error number
  info?: object; // If present, extra details about the error condition
  message: string; // A system-provided human-readable description of the error
  path?: string; // If present, the file path when reporting a file system error
  port?: number; // If present, the network connection port that is not available
  syscall: string; // The name of the system call that triggered the error
}

export function isAggregateError(cause: unknown): cause is AggregateError {
  return cause instanceof AggregateError;
}
