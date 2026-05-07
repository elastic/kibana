/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Severity level derived from a 0-100 numeric score.
 * Used consistently across queries (severity_score) and events (criticality).
 */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Derives the severity level from a 0-100 score.
 * Bands: critical (80-100), high (60-79), medium (40-59), low (0-39).
 */
export const getSeverityLevel = (score: number): SeverityLevel => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};
