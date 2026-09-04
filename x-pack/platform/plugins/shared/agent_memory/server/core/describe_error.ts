/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError } from '@kbn/es-errors';

/**
 * Returns diagnostics that cannot include query text or memory content.
 */
export const describeError = (error: unknown): string => {
  if (isResponseError(error)) {
    const errorType = error.body?.error?.type;
    const parts = [`kind=ResponseError`, `status_code=${error.statusCode}`];

    if (typeof errorType === 'string') {
      parts.push(`type=${errorType}`);
    }

    return parts.join(' ');
  }

  return error instanceof Error ? 'kind=Error' : 'kind=unknown';
};
