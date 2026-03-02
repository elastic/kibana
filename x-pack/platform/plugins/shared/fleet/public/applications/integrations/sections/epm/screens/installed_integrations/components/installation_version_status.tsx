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
  EuiToolTip,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';

import { useAuthz, useReviewUpgradeMutation, useStartServices } from '../../../../../../../hooks';
import type { InstallFailedAttempt } from '../../../../../../../../common/types';
import type { InstalledPackageUIPackageListItem } from '../types';
import { useInstalledIntegrationsActions } from '../hooks/use_installed_integrations_actions';

import { DisabledWrapperTooltip } from './disabled_wrapper_tooltip';

const InstalledVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="m" type="checkInCircleFilled" color="success" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{item.installationInfo?.version ?? item.version}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

const UpgradeAvailableVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const authz = useAuthz();
  const isDisabled = !authz.integrations.upgradePackages;
  const {
    actions: { bulkUpgradeIntegrationsWithConfirmModal },
  } = useInstalledIntegrationsActions();
  return (
    <DisabledWrapperTooltip
      tooltipContent={
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.upgradeRequiredPermissionTooltip"
          defaultMessage={"You don't have permissions to upgrade. Contact your administrator."}
        />
      }
      disabled={isDisabled}
    >
      <EuiButtonEmpty
        size="s"
        iconType="gear"
        flush="left"
        onClick={() => {
          bulkUpgradeIntegrationsWithConfirmModal([item]);
        }}
        disabled={isDisabled}
      >
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.upgradeAvailableButton"
          defaultMessage="Upgrade to {version}"
          values={{
            version: item.version,
          }}
        />
      </EuiButtonEmpty>
    </DisabledWrapperTooltip>
  );
});

const UpgradingVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.upgradingTooltip"
          defaultMessage={'Upgrading to {version}'}
          values={{ version: item.version }}
        />
      }
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size={'m'} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.fleet.epmInstalledIntegrations.upgradingText"
            defaultMessage="Upgrading..."
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
});

const UninstallingVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size={'m'} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.fleet.epmInstalledIntegrations.uninstallingText"
          defaultMessage="Uninstalling..."
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

function formatAttempt(attempt: InstallFailedAttempt): React.ReactNode {
  return (
    <>
      <FormattedMessage
        id="xpack.fleet.packageCard.faileAttemptDescription"
        defaultMessage="Failed at {attemptDate}."
        values={{
          attemptDate: (
            <>
              <FormattedDate
                value={attempt.created_at}
                year="numeric"
                month="short"
                day="numeric"
              />
              <> @ </>
              <FormattedTime
                value={attempt.created_at}
                hour="numeric"
                minute="numeric"
                second="numeric"
              />
            </>
          ),
        }}
      />
      <p>
        {attempt.error?.name || ''} : {attempt.error?.message || ''}
      </p>
    </>
  );
}

const InstallUpgradeFailedVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
  isUpgradeFailed: boolean;
}> = React.memo(({ item, isUpgradeFailed }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  //  TODO handle failed install too
  // TODO permissions check and tooltip

  const button = (
    <EuiButtonEmpty
      size="s"
      flush="left"
      onClick={() => setIsPopoverOpen((currentVal) => !currentVal)}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="m" type="error" color="danger" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isUpgradeFailed ? (
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.statusUpgradeFailedLabel"
              defaultMessage="Upgrade failed"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.statusInstallFailedLabel"
              defaultMessage="Install failed"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButtonEmpty>
  );

  const latestAttempt = item.installationInfo?.latest_install_failed_attempts?.[0];

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
      <EuiCallOut
        css={{ maxWidth: 400 }}
        color="danger"
        title={
          isUpgradeFailed ? (
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.statusUpgradeFailedLabel"
              defaultMessage="Upgrade to {version } failed"
              values={{
                version: latestAttempt?.target_version,
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.statusInstallFailedLabel"
              defaultMessage="Install failed"
            />
          )
        }
      >
        {latestAttempt ? formatAttempt(latestAttempt) : null}
        {isUpgradeFailed && (
          // TODO Implement on click https://github.com/elastic/kibana/issues/209867
          <EuiButton color="danger" fill={true}>
            <FormattedMessage
              id="xpack.fleet.epmInstalledIntegrations.retryUpgradeButtonLabel"
              defaultMessage="Retry Upgrade"
            />
          </EuiButton>
        )}
      </EuiCallOut>
    </EuiPopover>
  );
});

const PendingUpgradeReviewStatus: React.FunctionComponent<{
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
            defaultMessage="Review upgrade"
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

const DeclinedUpgradeStatus: React.FunctionComponent<{
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

export const InstallationVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const status = item.ui.installation_status;

  if (status === 'installed') {
    return <InstalledVersionStatus item={item} />;
  } else if (status === 'upgrade_available') {
    return <UpgradeAvailableVersionStatus item={item} />;
  } else if (status === 'pending_upgrade_review') {
    return <PendingUpgradeReviewStatus item={item} />;
  } else if (status === 'declined_review') {
    return <DeclinedUpgradeStatus item={item} />;
  } else if (status === 'upgrading') {
    return <UpgradingVersionStatus item={item} />;
  } else if (status === 'uninstalling') {
    return <UninstallingVersionStatus item={item} />;
  } else if (status === 'upgrade_failed') {
    return <InstallUpgradeFailedVersionStatus isUpgradeFailed={true} item={item} />;
  } else if (status === 'install_failed') {
    return <InstallUpgradeFailedVersionStatus isUpgradeFailed={false} item={item} />;
  } else return null;
});
