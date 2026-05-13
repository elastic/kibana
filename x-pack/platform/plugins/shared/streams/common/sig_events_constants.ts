/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VERDICT_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export type Verdict = (typeof VERDICT_OPTIONS)[number];

export const IMPACT_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
export type Impact = (typeof IMPACT_OPTIONS)[number];

export const VERDICT_COLORS: Record<Verdict, string> = {
  promoted: 'success',
  acknowledged: 'warning',
  demoted: 'default',
};

export const IMPACT_COLORS: Record<Impact, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
};

const isVerdict = (v: string): v is Verdict => v in VERDICT_COLORS;
const isImpact = (v: string): v is Impact => v in IMPACT_COLORS;

export const getVerdictColor = (verdict: string): string =>
  isVerdict(verdict) ? VERDICT_COLORS[verdict] : 'default';

export const getImpactColor = (impact: string): string =>
  isImpact(impact) ? IMPACT_COLORS[impact] : 'hollow';
