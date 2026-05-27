/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIG_EVENT_VERDICT_OPTIONS,
  type SigEventImpact,
  type SigEventVerdict,
} from '@kbn/streams-schema';

export const VERDICT_COLORS: Record<SigEventVerdict, string> = {
  promoted: 'success',
  acknowledged: 'warning',
  demoted: 'default',
};

export const IMPACT_COLORS: Record<SigEventImpact, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
};

const isVerdict = (v: string): v is SigEventVerdict =>
  (SIG_EVENT_VERDICT_OPTIONS as ReadonlyArray<string>).includes(v);

export const getVerdictColor = (verdict: string): string =>
  isVerdict(verdict) ? VERDICT_COLORS[verdict] : 'default';
