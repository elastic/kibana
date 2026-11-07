/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core/public';

/** What a failed request says: a short message, and the full details to show on request. */
export interface RequestErrorDescription {
  /** The server's message, or the request's own when there's no response, such as offline. */
  message: string;
  /** The response's status, then its message: "504 Gateway Timeout", and what the server said. */
  details: string;
}

/** Describes a failed request to Kibana for people, rather than with the browser's stack trace. */
export const describeRequestError = (error: Error): RequestErrorDescription => {
  const { body, response } = error as IHttpFetchError<{ message?: string }>;
  const message = body?.message ?? error.message;
  const status = response ? `${response.status} ${response.statusText}`.trim() : undefined;
  return {
    message,
    details: status && status !== message ? `${status}\n${message}` : message,
  };
};
