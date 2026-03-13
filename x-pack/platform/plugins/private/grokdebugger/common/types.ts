/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CustomPatterns = Record<string, string>;

export interface GrokdebuggerResponseParams {
  /**
   * Grok-parsed fields from ES `_source` (after stripping `rawEvent`).
   * Keys are grok capture names; values depend on the user's pattern at runtime,
   * so the shape is unknowable at compile time. Consumed opaquely via JSON.stringify
   * for display.
   */
  structuredEvent?: Record<string, unknown>;
  /**
   * Translated error message string when grok parsing fails, or `{}` when there
   * is no error. The empty-object sentinel is the original runtime convention;
   * checked via `isEmpty(error)`.
   */
  error?: string | Record<string, never>;
}
