/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { LiveStateSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import { RUNNING_LABEL } from '../translations';

/**
 * The flyout header's live state: a running indicator while a worker runs for the investigation.
 * The severity is not shown here: the header blocks carry it, in the severity picker.
 */
export const InvestigationLiveState: React.FC<LiveStateSlotRenderProps> = ({ conversationId }) => {
  const { data } = useInvestigation(conversationId);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
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
