/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VERDICT_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export type VerdictOption = (typeof VERDICT_OPTIONS)[number];

export const VERDICT_COLORS: Record<VerdictOption, string> = {
  promoted: 'success',
  acknowledged: 'warning',
  demoted: 'default',
};

const isVerdict = (v: string): v is VerdictOption =>
  (VERDICT_OPTIONS as ReadonlyArray<string>).includes(v);

export const getVerdictColor = (verdict: string): string =>
  isVerdict(verdict) ? VERDICT_COLORS[verdict] : 'default';
