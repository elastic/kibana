/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `String(value)` for a value of unknown origin. Stringifying throws for a prototype-less object and
 * for an `Error` whose `name` or `message` is a Symbol, and a failure handler that throws replaces
 * the failure it was reporting.
 */
export const safeToString = (value: unknown): string => {
  try {
    return String(value);
  } catch {
    return '[unprintable]';
  }
};
