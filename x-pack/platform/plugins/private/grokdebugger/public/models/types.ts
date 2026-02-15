/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CustomPatterns = Record<string, string>;

export interface GrokdebuggerResponseParams {
  structuredEvent?: Record<string, unknown>;
  /**
   * `error` is either a translated error message string, or an empty object (no error).
   */
  error?: string | Record<string, never>;
}
