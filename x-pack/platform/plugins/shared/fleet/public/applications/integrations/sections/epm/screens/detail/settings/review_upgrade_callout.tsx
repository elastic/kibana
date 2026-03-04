/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useReviewUpgradeMutation, useStartServices } from '../../../../../hooks';
import type { Installation } from '../../../../../../../../common/types';

interface ReviewUpgradeCalloutProps {
  pkgName: string;
  pkgTitle: string;
  pendingUpgradeReview: NonNullable<Installation['pending_upgrade_review']>;
}

export const PendingUpgradeReviewCallout: React.FC<ReviewUpgradeCalloutProps> = ({
  pkgName,
  pkgTitle,
  pendingUpgradeReview,
}) => {
  const reviewUpgradeMutation = useReviewUpgradeMutation();
  const { notifications } = useStartServices();

  const handleAccept = useCallback(() => {
    reviewUpgradeMutation.mutate(
      {
        pkgName,
        action: 'accept',
        targetVersion: pendingUpgradeReview.target_version,
      },
      {
        onSuccess: () => {
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.fleet.integrations.settings.upgradeReviewAcceptedTitle', {
              defaultMessage: 'Auto-upgrade accepted for {title} {version}',
              values: { title: pkgTitle, version: pendingUpgradeReview.target_version },
            }),
          });
        },
      }
    );
  }, [
    reviewUpgradeMutation,
    pkgName,
    pkgTitle,
    pendingUpgradeReview.target_version,
    notifications.toasts,
  ]);

  const handleDismiss = useCallback(() => {
    reviewUpgradeMutation.mutate(
      {
        pkgName,
        action: 'decline',
        targetVersion: pendingUpgradeReview.target_version,
      },
      {
        onSuccess: () => {
          notifications.toasts.addInfo({
            title: i18n.translate('xpack.fleet.integrations.settings.upgradeReviewDismissedTitle', {
              defaultMessage: 'Auto-upgrade paused for {title} {version}',
              values: { title: pkgTitle, version: pendingUpgradeReview.target_version },
            }),
          });
        },
      }
    );
  }, [
    reviewUpgradeMutation,
    pkgName,
    pkgTitle,
    pendingUpgradeReview.target_version,
    notifications.toasts,
  ]);

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
              onClick={handleAccept}
              isLoading={reviewUpgradeMutation.isLoading}
            >
              <FormattedMessage
                id="xpack.fleet.integrations.settings.acceptUpgradeButton"
                defaultMessage="Accept upgrade"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={handleDismiss}
              isLoading={reviewUpgradeMutation.isLoading}
            >
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

export const DeclinedUpgradeReviewCallout: React.FC<ReviewUpgradeCalloutProps> = ({
  pkgName,
  pkgTitle,
  pendingUpgradeReview,
}) => {
  const reviewUpgradeMutation = useReviewUpgradeMutation();
  const { notifications } = useStartServices();

  const resumeUpgradeLabel = (
    <FormattedMessage
      id="xpack.fleet.integrations.settings.resumeUpgradeLabel"
      defaultMessage="Resume upgrade"
    />
  );

  const handleReEnable = useCallback(() => {
    reviewUpgradeMutation.mutate(
      {
        pkgName,
        action: 'pending',
        targetVersion: pendingUpgradeReview.target_version,
      },
      {
        onSuccess: () => {
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.fleet.integrations.settings.upgradeReviewReEnabledTitle', {
              defaultMessage: 'Upgrade review resumed for {title} {version}',
              values: { title: pkgTitle, version: pendingUpgradeReview.target_version },
            }),
          });
        },
      }
    );
  }, [
    reviewUpgradeMutation,
    pkgName,
    pkgTitle,
    pendingUpgradeReview.target_version,
    notifications.toasts,
  ]);

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
        <EuiButton size="s" onClick={handleReEnable} isLoading={reviewUpgradeMutation.isLoading}>
          {resumeUpgradeLabel}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
