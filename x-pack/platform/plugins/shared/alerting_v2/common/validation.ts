/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@kbn/esql-language';

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;

export function validateDuration(value: string): string | void {
  if (!DURATION_RE.test(value)) {
    return `Invalid duration "${value}". Expected format like "5m", "1h", "30s", "250ms"`;
  }
}

export const validateEsqlQuery = (query: string): string | void => {
  const errors = Parser.parseErrors(query);
  if (errors.length > 0) {
    return `Invalid ES|QL query: ${errors[0].message}`;
  }
};
