/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiCallOut,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useReviewUpgradeMutation, useStartServices } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';

export const PendingUpgradeReviewStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const reviewUpgradeMutation = useReviewUpgradeMutation();
  const { notifications } = useStartServices();

  const pendingReview = item.installationInfo?.pending_upgrade_review;
  const targetVersion = pendingReview?.target_version ?? '';
  const description = pendingReview?.deprecation_details?.description ?? '';

  const handleAccept = useCallback(() => {
    reviewUpgradeMutation.mutate(
      { pkgName: item.name, action: 'accept', targetVersion },
      {
        onSuccess: () => {
          setIsPopoverOpen(false);
          notifications.toasts.addSuccess({
            title: (
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.upgradeReviewAcceptedTitle"
                defaultMessage="Policy upgrade accepted"
              />
            ) as unknown as string,
          });
        },
      }
    );
  }, [reviewUpgradeMutation, item.name, targetVersion, notifications.toasts]);

  const handleDismiss = useCallback(() => {
    reviewUpgradeMutation.mutate(
      { pkgName: item.name, action: 'decline', targetVersion },
      {
        onSuccess: () => {
          setIsPopoverOpen(false);
          notifications.toasts.addInfo({
            title: (
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.upgradeReviewDismissedTitle"
                defaultMessage="Policy upgrade dismissed"
              />
            ) as unknown as string,
            text: (
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.upgradeReviewDismissedText"
                defaultMessage="Auto-upgrade is paused for version {version}. A newer version will re-prompt."
                values={{ version: targetVersion }}
              />
            ) as unknown as string,
          });
        },
      }
    );
  }, [reviewUpgradeMutation, item.name, targetVersion, notifications.toasts]);

  const button = (
    <EuiButtonEmpty
      size="s"
      flush="left"
      onClick={() => setIsPopoverOpen((currentVal) => !currentVal)}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="m" type="warning" color="warning" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.statusPendingReviewLabel"
            defaultMessage="Review policies upgrade"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
      <EuiCallOut
        css={{ maxWidth: 400 }}
        color="warning"
        title={
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.pendingUpgradeReviewTitle"
            defaultMessage="Version {version} introduces deprecations"
            values={{ version: targetVersion }}
          />
        }
      >
        {description && <p>{description}</p>}
        <EuiSpacer size="s" />
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
                id="xpack.fleet.epmInstalledIntegrations.acceptUpgradeButton"
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
                id="xpack.fleet.epmInstalledIntegrations.dismissUpgradeButton"
                defaultMessage="Dismiss"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </EuiPopover>
  );
});

export const DeclinedUpgradeStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const reviewUpgradeMutation = useReviewUpgradeMutation();
  const { notifications } = useStartServices();

  const pendingReview = item.installationInfo?.pending_upgrade_review;
  const targetVersion = pendingReview?.target_version ?? '';

  const handleReEnable = useCallback(() => {
    reviewUpgradeMutation.mutate(
      { pkgName: item.name, action: 'pending', targetVersion },
      {
        onSuccess: () => {
          notifications.toasts.addSuccess({
            title: (
              <FormattedMessage
                id="xpack.fleet.epmInstalledIntegrations.upgradeReviewReEnabledTitle"
                defaultMessage="Upgrade review re-enabled"
              />
            ) as unknown as string,
          });
        },
      }
    );
  }, [reviewUpgradeMutation, item.name, targetVersion, notifications.toasts]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="m" type="minusInCircle" color="subdued" aria-label="Upgrade paused" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.statusUpgradePausedLabel"
          defaultMessage="Upgrade paused"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          onClick={handleReEnable}
          isLoading={reviewUpgradeMutation.isLoading}
        >
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.reEnableUpgradeButton"
            defaultMessage="Re-enable"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
