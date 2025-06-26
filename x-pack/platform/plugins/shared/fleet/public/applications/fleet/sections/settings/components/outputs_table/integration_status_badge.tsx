/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const IntegrationStatusBadge: React.FunctionComponent<{
  status: string;
  onClick?: () => void;
  onClickAriaLabel?: string;
}> = ({ status, onClick, onClickAriaLabel }) => {
  const onClickProps: any =
    onClick && onClickAriaLabel
      ? {
          onClick,
          onClickAriaLabel,
        }
      : {};
  const IntegrationSyncStatusBadge: { [status: string]: JSX.Element | null } = {
    FAILED: (
      <EuiBadge
        color="danger"
        data-test-subj="integrationSyncFailedBadge"
        iconType="errorFilled"
        {...onClickProps}
      >
        <FormattedMessage
          id="xpack.fleet.integrationSyncStatus.failedText"
          defaultMessage="Failed"
        />
      </EuiBadge>
    ),
    WARNING: (
      <EuiBadge
        color="warning"
        data-test-subj="integrationSyncWarningBadge"
        iconType="warning"
        {...onClickProps}
      >
        <FormattedMessage
          id="xpack.fleet.integrationSyncStatus.warningText"
          defaultMessage="Warning"
        />
      </EuiBadge>
    ),
    COMPLETED: (
      <EuiBadge
        color="success"
        data-test-subj="integrationSyncCompletedBadge"
        iconType="check"
        {...onClickProps}
      >
        <FormattedMessage
          id="xpack.fleet.integrationSyncStatus.completedText"
          defaultMessage="Completed"
        />
      </EuiBadge>
    ),
    SYNCHRONIZING: (
      <EuiBadge color="hollow" data-test-subj="integrationSyncSyncingBadge" {...onClickProps}>
        <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.fleet.integrationSyncStatus.syncingText"
              defaultMessage="Syncing..."
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    ),
    NA: (
      <EuiFlexGroup alignItems="baseline" justifyContent="flexStart" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <FormattedMessage id="xpack.fleet.integrationSyncStatus.naText" defaultMessage="N/A" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.fleet.integrationSyncStatus.naTooltip', {
              defaultMessage: 'Integration syncing only applies to remote outputs.',
            })}
          >
            <EuiIcon type="info" color="subdued" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    DISABLED: (
      <EuiFlexGroup alignItems="baseline" justifyContent="flexStart" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.fleet.integrationSyncStatus.disabledText"
              defaultMessage="Sync disabled"
            />{' '}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.fleet.integrationSyncStatus.disabledTooltip', {
              defaultMessage:
                'Integration syncing is disabled for this remote output. Enable it by clicking the edit icon and updating the output settings.',
            })}
          >
            <EuiIcon type="info" color="subdued" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };

  return IntegrationSyncStatusBadge[status];
};
