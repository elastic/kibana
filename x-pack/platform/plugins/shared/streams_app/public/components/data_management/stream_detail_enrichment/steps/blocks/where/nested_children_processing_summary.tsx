/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { StepsProcessingSummaryMap } from '../../../hooks/use_steps_processing_summary';
import { getNestedMessage } from './utils';

export const NestedChildrenProcessingSummary = ({
  childIds,
  stepsProcessingSummaryMap,
}: {
  childIds: Set<string>;
  stepsProcessingSummaryMap: StepsProcessingSummaryMap | undefined;
}) => {
  if (!stepsProcessingSummaryMap) return null;

  const statusCounts: Record<string, number> = {};
  let stepsCount = 0;
  let conditionsCount = 0;

  for (const id of childIds) {
    const status = stepsProcessingSummaryMap.get(id);
    if (status) {
      if (status === 'disabled.processorBeforePersisted') {
        statusCounts.disabled = (statusCounts.disabled || 0) + 1;
        stepsCount++;
      } else if (
        status === 'skipped.followsProcessorBeingEdited' ||
        status === 'skipped.createdInPreviousSimulation'
      ) {
        statusCounts.skipped = (statusCounts.skipped || 0) + 1;
        stepsCount++;
      } else if (status === 'condition') {
        conditionsCount++;
      } else {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        stepsCount++;
      }
    }
  }

  const message = getNestedMessage(statusCounts, stepsCount, conditionsCount);

  return message ? (
    <EuiText size="xs" color="subdued">
      {message}
    </EuiText>
  ) : null;
};
