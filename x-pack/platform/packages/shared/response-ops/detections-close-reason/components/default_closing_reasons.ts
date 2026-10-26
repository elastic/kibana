/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

export const DEFAULT_DETECTIONS_CLOSE_REASONS_KEY =
  'securitySolution:detectionsCloseReasons' as const;

interface DefaultClosingReasonOption {
  key?: string;
  label: string;
}

export const DEFAULT_CLOSING_REASON_OPTIONS: DefaultClosingReasonOption[] = [
  { label: i18n.CLOSING_REASON_CLOSE_WITHOUT_REASON, key: undefined },
  { label: i18n.CLOSING_REASON_DUPLICATE, key: 'duplicate' },
  { label: i18n.CLOSING_REASON_FALSE_POSITIVE, key: 'false_positive' },
  { label: i18n.CLOSING_REASON_TRUE_POSITIVE, key: 'true_positive' },
  { label: i18n.CLOSING_REASON_BENIGN_POSITIVE, key: 'benign_positive' },
  { label: i18n.CLOSING_REASON_OTHER, key: 'other' },
];

const defaultClosingReasonLabels: Record<string, string> = {
  duplicate: i18n.CLOSING_REASON_DUPLICATE,
  false_positive: i18n.CLOSING_REASON_FALSE_POSITIVE,
  true_positive: i18n.CLOSING_REASON_TRUE_POSITIVE,
  benign_positive: i18n.CLOSING_REASON_BENIGN_POSITIVE,
  other: i18n.CLOSING_REASON_OTHER,
  automated_closure: i18n.CLOSING_REASON_AUTOMATED_CLOSURE,
};

export const getDefaultClosingReasonLabel = (closeReason: string): string =>
  defaultClosingReasonLabels[closeReason] ?? closeReason;
