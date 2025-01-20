/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const CLUSTER_BLOCK_EXCEPTION = 'cluster_block_exception';

export class ErrorWithType extends Error {
  public readonly type: string;

  constructor({
    type,
    message = 'Unknown error',
    stack,
  }: {
    type: string;
    message?: string;
    stack?: string;
  }) {
    super(message);
    this.type = type;
    this.stack = stack;
  }
}

export function getErrorType(error: Error): string | undefined {
  if (isErrorWithType(error)) {
    return error.type;
  }
}

export function isErrorWithType(error: Error | ErrorWithType): error is ErrorWithType {
  return error instanceof ErrorWithType;
}

export function isClusterBlockError(err: Error) {
  return getErrorType(err) === CLUSTER_BLOCK_EXCEPTION;
}
