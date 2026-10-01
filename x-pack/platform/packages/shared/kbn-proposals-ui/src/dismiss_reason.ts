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
  no_reason: i18n.translate('xpack.proposals.dismissReason.noReason', {
    defaultMessage: 'Decline without a reason',
  }),
  duplicate: i18n.translate('xpack.proposals.dismissReason.duplicate', {
    defaultMessage: 'Already reported elsewhere (duplicate)',
  }),
  false_positive: i18n.translate('xpack.proposals.dismissReason.falsePositive', {
    defaultMessage: 'Not a real issue (false positive)',
  }),
  handled_elsewhere: i18n.translate('xpack.proposals.dismissReason.handledElsewhere', {
    defaultMessage: 'Handled elsewhere',
  }),
  risk_accepted: i18n.translate('xpack.proposals.dismissReason.riskAccepted', {
    defaultMessage: 'No actions needed (risk is acceptable)',
  }),
  other: i18n.translate('xpack.proposals.dismissReason.other', {
    defaultMessage: 'Other',
  }),
};

/** For an `EuiSelect`/`EuiRadioGroup`, in the order the decline form presents them. */
export const DISMISS_REASON_OPTIONS = dismissReasonSchema.options.map((value) => ({
  value,
  text: DISMISS_REASON_LABELS[value],
  label: DISMISS_REASON_LABELS[value],
  id: value,
}));

/**
 * The reason line a decided (`dismissed`) proposal shows — the structured reason first, since
 * that is what a scanning analyst wants, then the free-text rationale when the decliner left one.
 */
export const formatDismissReason = (dismissReason: DismissReason, rationale?: string): string => {
  const label = DISMISS_REASON_LABELS[dismissReason];
  return rationale ? `${label} — ${rationale}` : label;
};
