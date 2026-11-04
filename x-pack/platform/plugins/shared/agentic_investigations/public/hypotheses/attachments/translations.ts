/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HypothesisStatus } from '../../../common/hypotheses/hypotheses';

export const HYPOTHESES_LABEL = i18n.translate(
  'xpack.agenticInvestigations.hypotheses.attachments.label',
  { defaultMessage: 'Hypotheses' }
);

export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  investigating: i18n.translate('xpack.agenticInvestigations.hypotheses.status.investigating', {
    defaultMessage: 'Investigating',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.hypotheses.status.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  confirmed: i18n.translate('xpack.agenticInvestigations.hypotheses.status.confirmed', {
    defaultMessage: 'Confirmed',
  }),
};

export const confidenceLabel = (confidence: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypotheses.confidence', {
    defaultMessage: '{confidence}% confidence',
    values: { confidence: Math.round(confidence * 100) },
  });
