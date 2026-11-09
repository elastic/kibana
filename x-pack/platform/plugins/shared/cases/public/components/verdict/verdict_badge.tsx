/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { CaseVerdict } from '../../../common/types/domain';
import { VERDICT_LABELS } from './translations';

const VERDICT_COLORS: Record<CaseVerdict, string> = {
  true_positive: 'danger',
  false_positive: 'success',
  benign_positive: 'default',
  suspicious: 'warning',
  undetermined: 'hollow',
};

export const isCaseVerdict = (value: unknown): value is CaseVerdict =>
  typeof value === 'string' && value in VERDICT_LABELS;

export const VerdictBadge: React.FC<{
  verdict: CaseVerdict;
  confidence?: number | null;
  'data-test-subj'?: string;
}> = ({ verdict, confidence, 'data-test-subj': dataTestSubj }) => (
  <EuiBadge color={VERDICT_COLORS[verdict]} data-test-subj={dataTestSubj}>
    {VERDICT_LABELS[verdict]}
    {confidence != null ? ` · ${Math.round(confidence * 100)}%` : ''}
  </EuiBadge>
);
VerdictBadge.displayName = 'VerdictBadge';
