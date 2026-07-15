/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Formats an epoch-ms as ISO-8601 without milliseconds (the style used in the config files). */
export function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Splits a `<cluster>:<pattern>` index expression into `[prefix, bare]`, where `prefix`
 * includes the trailing colon (`serverless-logging-us-east-1:`) and is `''` when the
 * pattern has no cluster alias. Lets callers strip, re-apply, or inspect the CCS prefix
 * without re-implementing the colon split.
 */
export function splitClusterAlias(pattern: string): [prefix: string, bare: string] {
  const colon = pattern.indexOf(':');
  return colon >= 0 ? [pattern.slice(0, colon + 1), pattern.slice(colon + 1)] : ['', pattern];
}
