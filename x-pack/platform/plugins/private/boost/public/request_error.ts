/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core/public';

/** What a failed request says, for people rather than with the browser's stack trace. */
export interface RequestErrorDescription {
  /** The response's status, such as "504 Gateway Timeout", unless there was no response. */
  status?: string;
  /** The server's message, or the request's own when there's no response, such as offline. */
  message: string;
}

/** Describes a failed request to Kibana: its response's status, and what the server said. */
export const describeRequestError = (error: Error): RequestErrorDescription => {
  const { body, response } = error as IHttpFetchError<{ message?: string }>;
  return {
    // Over HTTP/2, responses have no status text, so the code stands alone.
    status: response ? `${response.status} ${response.statusText}`.trim() : undefined,
    message: body?.message ?? error.message,
  };
};
