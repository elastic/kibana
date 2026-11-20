/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Describes anything that was thrown as a string, since the status only stores strings. */
export const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
