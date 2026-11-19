/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts a human-readable message from an unknown error, preferring the
 * server-provided detail on `error.body.message` over the generic `error.message`
 */
export const getErrorMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ||
  (error as Error)?.message ||
  'Unknown error';
