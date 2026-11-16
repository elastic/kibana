/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `sendRequest` reports a failure as the plain response body (`{ statusCode, error, message }`),
 * not as an Error instance, so read the message off it and fall back when there is none.
 */
export const toRequestError = (error: unknown, fallback: string): Error =>
  new Error((error as { message?: string } | null | undefined)?.message || fallback);
