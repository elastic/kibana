/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphRecursionError } from '@langchain/langgraph';
import { GenerationErrorCode } from '../../common/constants';
import { RecursionLimitError } from '../lib/errors';

/**
 * Handles errors that occur during the execution of a function.
 * If the error is an instance of GraphRecursionError, it throws a RecursionLimitError with the same message and error code.
 * Otherwise, it rethrows the original error.
 *
 * @param err - The error that occurred.
 * @param errorCode - The error code associated with the error.
 * @throws {RecursionLimitError} If the error is an instance of GraphRecursionError.
 * @throws {Error} The original error.
 */
export function handleCustomErrors(
  err: Error,
  recursionErrorCode:
    | GenerationErrorCode.RECURSION_LIMIT
    | GenerationErrorCode.RECURSION_LIMIT_ANALYZE_LOGS
) {
  if (err instanceof GraphRecursionError) {
    throw new RecursionLimitError(err.message, recursionErrorCode);
  }
  throw err;
}
