/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const statusLabels: Record<string, string> = {
  pending: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.pending', {
    defaultMessage: 'pending',
  }),
  running: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.running', {
    defaultMessage: 'running',
  }),
  failed: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.failed', {
    defaultMessage: 'failed',
  }),
  successful: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.successful', {
    defaultMessage: 'successful',
  }),
  disabled: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.disabled', {
    defaultMessage: 'disabled',
  }),
  skipped: i18n.translate('xpack.streams.nestedChildrenProcessingSummary.skipped', {
    defaultMessage: 'skipped',
  }),
};

export const getNestedMessage = (
  statusCounts: Record<string, number>,
  stepsCount: number,
  conditionsCount: number
): string => {
  const hasSteps = stepsCount > 0;
  const hasConditions = conditionsCount > 0;

  // Build strings conditionally (only what's needed)
  const statusSummary = hasSteps
    ? Object.entries(statusCounts)
        .map(([status, count]) => `${count} ${statusLabels[status] || status}`)
        .join(', ')
    : '';

  const stepsLabel = hasSteps
    ? i18n.translate('xpack.streams.nestedChildrenProcessingSummary.stepsLabel', {
        defaultMessage: '{count, plural, one {step} other {steps}}',
        values: { count: stepsCount },
      })
    : '';

  const conditionLabel = hasConditions
    ? i18n.translate('xpack.streams.nestedChildrenProcessingSummary.conditionStepsLabel', {
        defaultMessage: '{count, plural, one {nested condition} other {nested conditions}}',
        values: { count: conditionsCount },
      })
    : '';

  const andLabel =
    hasSteps && hasConditions
      ? i18n.translate('xpack.streams.nestedChildrenProcessingSummary.and', {
          defaultMessage: 'and',
        })
      : '';

  // Compose and return based on what's present
  if (hasSteps && !hasConditions) {
    return `${statusSummary} ${stepsLabel}`;
  }

  if (!hasSteps && hasConditions) {
    return `${conditionsCount} ${conditionLabel}`;
  }

  if (hasSteps && hasConditions) {
    return `${statusSummary} ${stepsLabel} ${andLabel} ${conditionsCount} ${conditionLabel}`;
  }

  return '';
};
