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

export const formatGeneratedAt = (dateStr: string): string => {
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 1) {
    return i18n.translate('xpack.streams.insights.justNow', { defaultMessage: 'just now' });
  }
  if (diffMins < 60) {
    return i18n.translate('xpack.streams.insights.minutesAgo', {
      defaultMessage: '{count} {count, plural, one {minute} other {minutes}} ago',
      values: { count: diffMins },
    });
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return i18n.translate('xpack.streams.insights.hoursAgo', {
      defaultMessage: '{count} {count, plural, one {hour} other {hours}} ago',
      values: { count: diffHours },
    });
  }
  return i18n.translate('xpack.streams.insights.daysAgo', {
    defaultMessage: '{count} {count, plural, one {day} other {days}} ago',
    values: { count: Math.floor(diffHours / 24) },
  });
};
