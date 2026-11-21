/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { InvestigationRecord, Verdict } from '../../../../common/investigations/types';
import { VERDICT_LABELS } from '../../../../common/investigations/types';
import * as i18n from './translations';

const VERDICT_COLORS = {
  true_positive: 'danger',
  benign: 'success',
  inconclusive: 'warning',
} as const;

export interface EffectiveVerdict {
  /** Text for the badge. */
  label: string;
  classification: Verdict | null;
  /** Who set it; null when there is no verdict. */
  source: 'analyst' | 'agent' | null;
}

/** The analyst verdict when set, otherwise the agent verdict, otherwise nothing. */
export const getEffectiveVerdict = (
  record: Pick<InvestigationRecord, 'analyst_verdict' | 'agent_verdict'> &
    Partial<Pick<InvestigationRecord, 'close_outcome'>>
): EffectiveVerdict => {
  const { analyst_verdict: analyst, agent_verdict: agent, close_outcome: outcome } = record;
  // The verdict chosen when closing is the final one.
  if (outcome) {
    return {
      label: VERDICT_LABELS[outcome.verdict],
      classification: outcome.verdict,
      source: 'analyst',
    };
  }
  if (analyst) {
    return {
      label: VERDICT_LABELS[analyst.verdict],
      classification: analyst.verdict,
      source: 'analyst',
    };
  }
  if (agent) {
    return { label: agent.label, classification: agent.classification, source: 'agent' };
  }
  return { label: i18n.VERDICT_NOT_SET, classification: null, source: null };
};

export interface VerdictBadgeProps {
  /** Text for the badge. Defaults to the label of `verdict`. */
  label?: string;
  verdict: Verdict | null;
  /** Agent verdicts are not final, so they use the warning colour. */
  source?: 'analyst' | 'agent' | null;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  label,
  verdict,
  source = 'analyst',
}) => {
  const text = label ?? (verdict ? VERDICT_LABELS[verdict] : i18n.VERDICT_NOT_SET);
  const color =
    verdict === null ? 'hollow' : source === 'agent' ? 'warning' : VERDICT_COLORS[verdict];

  return (
    <EuiBadge color={color} data-test-subj="investigationVerdictBadge">
      {text}
    </EuiBadge>
  );
};
VerdictBadge.displayName = 'VerdictBadge';
