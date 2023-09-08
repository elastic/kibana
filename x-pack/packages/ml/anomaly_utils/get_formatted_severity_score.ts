/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns formatted severity score.
 * @param score - A normalized score between 0-100, which is based on the probability of the anomalousness of this record
 */
export function getFormattedSeverityScore(score: number): string {
  return score < 1 ? '< 1' : String(parseInt(String(score), 10));
}
