/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusErrorReasons } from '../types';

export class ErrorWithReason extends Error {
  public readonly reason: RuleExecutionStatusErrorReasons;
  public readonly error: Error;

  constructor(reason: RuleExecutionStatusErrorReasons, error: Error) {
    super(error.message);
    this.error = error;
    this.reason = reason;
  }
}

export function getReasonFromError(error: Error): RuleExecutionStatusErrorReasons {
  if (isErrorWithReason(error)) {
    return error.reason;
  }
  return RuleExecutionStatusErrorReasons.Unknown;
}

export function isErrorWithReason(error: Error | ErrorWithReason): error is ErrorWithReason {
  return error instanceof ErrorWithReason;
}
