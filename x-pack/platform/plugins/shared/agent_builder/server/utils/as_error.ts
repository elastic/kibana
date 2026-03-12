/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalize unknown thrown values to an `Error`.
 */
export const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
