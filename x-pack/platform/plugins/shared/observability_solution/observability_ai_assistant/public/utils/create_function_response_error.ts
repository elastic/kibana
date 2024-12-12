/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';

// this one does not check for ES errors, they don't get to the browser
// and we prevent importing Node.js-only code
export function createPublicFunctionResponseError({
  name,
  error,
  message,
}: {
  name: string;
  error: Error;
  message?: string;
}) {
  const sanitizedError: Record<string, unknown> = JSON.parse(
    'toJSON' in error && typeof error.toJSON === 'function' ? error.toJSON() : JSON.stringify(error)
  );

  return createFunctionResponseMessage({
    name,
    content: {
      error: {
        ...sanitizedError,
        name: error.name,
        message: error.message,
        cause: error.cause,
      },
      message: message || error.message,
    },
    data: {
      stack: error.stack,
    },
  });
}
