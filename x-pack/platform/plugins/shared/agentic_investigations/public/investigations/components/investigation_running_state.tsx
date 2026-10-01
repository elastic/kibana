/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { RunningStateSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useInvestigation } from '../hooks/use_investigation';
import { RUNNING_LABEL } from './translations';

/** The flyout header's running indicator. Renders nothing once no agent works on it. */
export const InvestigationRunningState: React.FC<RunningStateSlotRenderProps> = ({
  conversationId,
}) => {
  const { data } = useInvestigation(conversationId);
  if (!data?.in_progress) {
    return null;
  }
  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      data-test-subj="investigationRunningState"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {RUNNING_LABEL}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
