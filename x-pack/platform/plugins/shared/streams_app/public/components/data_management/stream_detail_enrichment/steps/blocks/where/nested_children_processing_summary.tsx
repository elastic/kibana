/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiText } from '@elastic/eui';
import type { StepsProcessingSummaryMap } from '../../../state_management/use_steps_processing_summary';

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

export const NestedChildrenProcessingSummary = ({
  childIds,
  stepsProcessingSummaryMap,
}: {
  childIds: Set<string>;
  stepsProcessingSummaryMap: StepsProcessingSummaryMap | undefined;
}) => {
  if (!stepsProcessingSummaryMap) return null;

  const statusCounts: Record<string, number> = {};

  for (const id of childIds) {
    const status = stepsProcessingSummaryMap.get(id);
    if (status) {
      if (status === 'disabled.processorBeforePersisted') {
        statusCounts.disabled = (statusCounts.disabled || 0) + 1;
      } else if (
        status === 'skipped.followsProcessorBeingEdited' ||
        status === 'skipped.createdInPreviousSimulation'
      ) {
        statusCounts.skipped = (statusCounts.skipped || 0) + 1;
      } else {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    }
  }

  const total = Array.from(childIds).length;

  const summary = Object.entries(statusCounts)
    .map(([status, count]) => `${count} ${statusLabels[status] || status}`)
    .join(', ');

  const stepsLabel = i18n.translate('xpack.streams.nestedChildrenProcessingSummary.stepsLabel', {
    defaultMessage: '{count, plural, one {step} other {steps}}',
    values: { count: total },
  });

  return summary ? (
    <EuiText size="xs" color="subdued">
      {summary} {stepsLabel}
    </EuiText>
  ) : null;
};
