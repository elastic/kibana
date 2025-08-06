/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function joinArrayValues(record: Record<string, string[]>, delimiter: string = ',') {
  const results: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    results[key] = value.join(delimiter);
  }
  return results;
}
