/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { dismissReasonSchema } from '@kbn/proposals-common';
import type { DismissReason } from '@kbn/proposals-common';

export const DISMISS_REASON_LABELS: Record<DismissReason, string> = {
  wrong: i18n.translate('xpack.proposals.dismissReason.wrong', {
    defaultMessage: 'Wrong',
  }),
  duplicate: i18n.translate('xpack.proposals.dismissReason.duplicate', {
    defaultMessage: 'Duplicate',
  }),
  insufficient_evidence: i18n.translate('xpack.proposals.dismissReason.insufficientEvidence', {
    defaultMessage: 'Insufficient evidence',
  }),
  low_value: i18n.translate('xpack.proposals.dismissReason.lowValue', {
    defaultMessage: 'Low value',
  }),
  out_of_scope: i18n.translate('xpack.proposals.dismissReason.outOfScope', {
    defaultMessage: 'Out of scope',
  }),
  already_handled: i18n.translate('xpack.proposals.dismissReason.alreadyHandled', {
    defaultMessage: 'Already handled',
  }),
  other: i18n.translate('xpack.proposals.dismissReason.other', {
    defaultMessage: 'Other',
  }),
};

export const DISMISS_REASON_OPTIONS = dismissReasonSchema.options.map((value) => ({
  value,
  text: DISMISS_REASON_LABELS[value],
}));
