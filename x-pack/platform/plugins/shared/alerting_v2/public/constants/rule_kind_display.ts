/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  alert: i18n.translate('xpack.alertingV2.ruleDetails.kindAlert', {
    defaultMessage: 'Alert',
  }),
  signal: i18n.translate('xpack.alertingV2.ruleDetails.kindSignal', {
    defaultMessage: 'Signal',
  }),
};

export const RULE_KIND_ICONS: Record<RuleKind, string> = {
  alert: 'bell',
  signal: 'radar',
};

export const RULE_KIND_TOOLTIPS: Record<RuleKind, string> = {
  alert: i18n.translate('xpack.alertingV2.ruleDetails.kindAlertTooltip', {
    defaultMessage:
      'Tracks a problem across state changes and can notify your team or trigger automated actions when the state changes.',
  }),
  signal: i18n.translate('xpack.alertingV2.ruleDetails.kindSignalTooltip', {
    defaultMessage:
      'Records each match as a data point without lifecycle tracking or notifications.',
  }),
};
