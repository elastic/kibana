/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InsightImpactLevel } from '@kbn/streams-schema';

export const impactBadgeColors = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
} as const satisfies Record<InsightImpactLevel, string>;

export const impactLabels = {
  critical: i18n.translate('xpack.streams.insights.impact.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.streams.insights.impact.high', { defaultMessage: 'High' }),
  medium: i18n.translate('xpack.streams.insights.impact.medium', { defaultMessage: 'Medium' }),
  low: i18n.translate('xpack.streams.insights.impact.low', { defaultMessage: 'Low' }),
} as const satisfies Record<InsightImpactLevel, string>;
