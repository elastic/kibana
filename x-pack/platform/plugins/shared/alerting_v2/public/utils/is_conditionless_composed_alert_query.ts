/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * True when a submitted query is composed with an empty/whitespace breach
 * segment — the temporary save-fail shape until empty segments are allowed.
 *
 * Signal rules cannot be composed (API requires standalone), so kind does not
 * need to be checked.
 */
export const isConditionlessComposedAlertQuery = (query?: {
  format?: string;
  breach?: { segment?: string };
}): boolean => query?.format === 'composed' && (query.breach?.segment ?? '').trim().length === 0;
