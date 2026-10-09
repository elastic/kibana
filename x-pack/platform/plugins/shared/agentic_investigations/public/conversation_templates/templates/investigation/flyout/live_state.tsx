/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  type LiveStateSlotRenderProps,
} from '@kbn/agentic-investigations-common';
import { isInvestigationSeverity } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { RUNNING_LABEL } from '../translations';

/**
 * The flyout header's live state: the severity, from the polled investigation (an agent sets it
 * mid-run) or else the conversation, and a running indicator while an agent works on it.
 */
export const InvestigationLiveState: React.FC<LiveStateSlotRenderProps> = ({
  conversationId,
  severity: conversationSeverity,
}) => {
  const { data } = useInvestigation(conversationId);
  const severity = data?.metadata.severity ?? conversationSeverity;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {isInvestigationSeverity(severity) && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={SEVERITY_COLORS[severity]} data-test-subj="investigationFlyoutSeverity">
            {SEVERITY_LABELS[severity]}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {data?.in_progress && (
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
