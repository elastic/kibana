/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { AttackDiscoveryStatus } from '@kbn/elastic-assistant-common';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiIconTip,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import * as i18n from './translations';

interface Props {
  hasViewed: boolean;
  status: AttackDiscoveryStatus;
  count: number;
}
export const AttackDiscoveryStatusIndicator: FunctionComponent<Props> = ({
  hasViewed,
  status,
  count,
}) => {
  if (status === 'running') {
    return (
      <EuiFlexItem grow={false} data-test-subj="status-running">
        <EuiToolTip
          aria-label={i18n.IN_PROGRESS_MESSAGE}
          content={i18n.IN_PROGRESS_MESSAGE}
          position="bottom"
        >
          <EuiLoadingSpinner size="s" />
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  if (hasViewed) return null;
  if (status === 'succeeded' && count != null) {
    return (
      <EuiFlexItem grow={false} data-test-subj="status-succeeded">
        <EuiToolTip
          aria-label={i18n.SUCCESS_MESSAGE(count)}
          content={i18n.SUCCESS_MESSAGE(count)}
          position="bottom"
        >
          <EuiNotificationBadge>{count}</EuiNotificationBadge>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  if (status === 'failed') {
    return (
      <EuiFlexItem grow={false} data-test-subj="status-failed">
        <EuiIconTip
          aria-label={i18n.FAILURE_MESSAGE}
          color="warning"
          content={i18n.FAILURE_MESSAGE}
          position="bottom"
          size="m"
          type="warning"
        />
      </EuiFlexItem>
    );
  }
  return null;
};
