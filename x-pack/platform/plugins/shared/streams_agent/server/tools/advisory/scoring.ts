/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type HealthSeverity = 'healthy' | 'warning' | 'critical';

/**
 * Scores data quality based on degraded and failed document percentages.
 *
 * Thresholds:
 * - Healthy: degraded ≤ 1% AND failed ≤ 0.1%
 * - Warning: degraded 1–10% OR failed 0.1–5%
 * - Critical: degraded > 10% OR failed > 5%
 */
export const scoreQuality = (degradedPct: number, failedPct: number): HealthSeverity => {
  if (degradedPct > 10 || failedPct > 5) {
    return 'critical';
  }
  if (degradedPct > 1 || failedPct > 0.1) {
    return 'warning';
  }
  return 'healthy';
};

/**
 * Scores schema completeness based on mapped vs unmapped field counts.
 *
 * Thresholds:
 * - Healthy: unmapped ratio ≤ 20%
 * - Warning: unmapped ratio > 20%
 *
 * Unmapped fields don't cause data loss — they simply mean those fields
 * are stored with generic types, reducing search/aggregation effectiveness.
 * Streams may legitimately have dynamic or pre-structured fields that
 * don't need explicit mappings, so this is never critical on its own.
 */
export const scoreSchema = (mappedCount: number, unmappedCount: number): HealthSeverity => {
  const total = mappedCount + unmappedCount;
  if (total === 0) {
    return 'healthy';
  }
  const unmappedRatio = unmappedCount / total;
  if (unmappedRatio > 0.2) {
    return 'warning';
  }
  return 'healthy';
};

/**
 * Scores retention configuration.
 *
 * Thresholds:
 * - Healthy: any retention (explicit via dsl/ilm, or inherited from parent)
 * - Warning: no retention configured (unknown)
 *
 * Inherited retention is normal for child streams in a wired hierarchy —
 * the parent's policy applies, so this is not a problem.
 */
export const scoreRetention = (
  lifecycleType: 'ilm' | 'dsl' | 'inherit' | 'unknown'
): HealthSeverity => {
  if (lifecycleType === 'ilm' || lifecycleType === 'dsl' || lifecycleType === 'inherit') {
    return 'healthy';
  }
  return 'warning';
};

/**
 * Scores failure store configuration relative to failed document count.
 *
 * Thresholds:
 * - Healthy: failure store enabled or inherited from parent
 * - Critical: failure store disabled/unknown AND failed docs > 0
 * - Healthy: failure store disabled/unknown but no failed docs
 *
 * Inherited failure store is normal in a wired hierarchy — the parent's
 * setting applies to child streams, same as retention inheritance.
 * Critical only fires when documents are actively being lost.
 */
export const scoreFailureStore = (
  status: 'enabled' | 'disabled' | 'inherited' | 'unknown',
  failedDocs: number
): HealthSeverity => {
  if (status === 'enabled' || status === 'inherited') {
    return 'healthy';
  }
  // disabled or unknown
  if (failedDocs > 0) {
    return 'critical';
  }
  return 'healthy';
};

/**
 * Scores processing pipeline coverage.
 *
 * Thresholds:
 * - Healthy: stream has processors, or no processors with low unmapped ratio
 * - Warning: no processors AND unmapped field ratio > 30%
 *
 * Not having processors is a valid state — streams can hold pre-processed
 * data or data that arrives already structured. This signal is a suggestion
 * that processors could help with unmapped fields, not an alarm.
 */
export const scoreProcessing = (hasProcessors: boolean, unmappedRatio: number): HealthSeverity => {
  if (hasProcessors) {
    return 'healthy';
  }
  if (unmappedRatio > 0.3) {
    return 'warning';
  }
  return 'healthy';
};

/**
 * Derives the overall health grade from individual signal scores.
 * The worst individual signal determines the overall grade.
 */
export const deriveOverallHealth = (scores: HealthSeverity[]): HealthSeverity => {
  if (scores.includes('critical')) {
    return 'critical';
  }
  if (scores.includes('warning')) {
    return 'warning';
  }
  return 'healthy';
};
