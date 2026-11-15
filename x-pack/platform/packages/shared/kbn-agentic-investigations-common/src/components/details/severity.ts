/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** The investigation template's `severity` values. */
export type InvestigationSeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/** Labels of the investigation template's `severity` values. */
export const SEVERITY_LABELS: Readonly<Record<InvestigationSeverityLevel, string>> = Object.freeze({
  low: i18n.translate('xpack.alertzero.detailsFlyout.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.alertzero.detailsFlyout.severity.medium', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.alertzero.detailsFlyout.severity.high', { defaultMessage: 'High' }),
  critical: i18n.translate('xpack.alertzero.detailsFlyout.severity.critical', {
    defaultMessage: 'Critical',
  }),
});

/** EUI colors of the investigation template's `severity` values. */
export const SEVERITY_COLORS: Readonly<
  Record<InvestigationSeverityLevel, 'danger' | 'warning' | 'primary' | 'success'>
> = Object.freeze({
  low: 'success',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
});
