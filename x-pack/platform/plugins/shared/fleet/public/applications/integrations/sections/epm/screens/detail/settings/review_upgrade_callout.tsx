/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UpgradeReviewProps } from '../../../../../hooks';
import { useUpgradeReviewActions } from '../../../../../hooks';

export const PendingUpgradeReviewCallout: React.FC<UpgradeReviewProps> = ({
  pkgName,
  pkgTitle,
  pendingUpgradeReview,
}) => {
  const { handleAccept, handleDismiss, isLoading } = useUpgradeReviewActions({
    pkgName,
    pkgTitle,
    targetVersion: pendingUpgradeReview.target_version,
  });

  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.fleet.integrations.settings.pendingUpgradeReviewTitle"
            defaultMessage="Review policies upgrade"
          />
        }
      >
        <FormattedMessage
          id="xpack.fleet.integrations.settings.pendingUpgradeReviewDescription"
          defaultMessage="Version {version} introduces deprecations that might affect your current setup. Review the changes carefully before upgrading your policies."
          values={{ version: pendingUpgradeReview.target_version }}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="warning"
              fill={true}
              size="s"
              onClick={() => handleAccept()}
              isLoading={isLoading}
            >
              <FormattedMessage
                id="xpack.fleet.integrations.settings.acceptUpgradeButton"
                defaultMessage="Accept upgrade"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={() => handleDismiss()} isLoading={isLoading}>
              <FormattedMessage
                id="xpack.fleet.integrations.settings.pauseUpgradeButton"
                defaultMessage="Pause upgrade"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};

export const DeclinedUpgradeReviewCallout: React.FC<UpgradeReviewProps> = ({
  pkgName,
  pkgTitle,
  pendingUpgradeReview,
}) => {
  const { handleReEnable, isLoading } = useUpgradeReviewActions({
    pkgName,
    pkgTitle,
    targetVersion: pendingUpgradeReview.target_version,
  });

  const resumeUpgradeLabel = (
    <FormattedMessage
      id="xpack.fleet.integrations.settings.resumeUpgradeLabel"
      defaultMessage="Resume upgrade"
    />
  );

  return (
    <>
      <EuiCallOut
        color="primary"
        iconType="minusInCircle"
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.fleet.integrations.settings.declinedUpgradeReviewTitle"
            defaultMessage="Policy upgrade paused for version {version}"
            values={{ version: pendingUpgradeReview.target_version }}
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.integrations.settings.declinedUpgradeReviewDescription"
            defaultMessage="You previously paused the upgrade review. Select {resumeUpgrade} to review the changes and decide whether to accept the upgrade."
            values={{
              resumeUpgrade: <strong>{resumeUpgradeLabel}</strong>,
            }}
          />
        </p>
        <EuiSpacer size="s" />
        <EuiButton size="s" onClick={() => handleReEnable()} isLoading={isLoading}>
          {resumeUpgradeLabel}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
