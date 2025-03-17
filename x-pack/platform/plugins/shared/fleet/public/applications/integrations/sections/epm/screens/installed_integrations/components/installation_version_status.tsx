/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';

import { useAuthz } from '../../../../../../../hooks';
import type { InstallFailedAttempt } from '../../../../../../../../common/types';
import type { InstalledPackageUIPackageListItem } from '../types';

import { DisabledWrapperTooltip } from './disabled_wrapper_tooltip';

const InstalledVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon size="m" type="checkInCircleFilled" color="success" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{item.version}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

const UpgradeAvailableVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const authz = useAuthz();
  const isDisabled = !authz.integrations.upgradePackages;

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
        // TODO Implement on click https://github.com/elastic/kibana/issues/209867
        onClick={() => {}}
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
          <EuiIcon size="m" type="error" color="danger" />
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

export const InstallationVersionStatus: React.FunctionComponent<{
  item: InstalledPackageUIPackageListItem;
}> = React.memo(({ item }) => {
  const status = item.ui.installation_status;

  if (status === 'installed') {
    return <InstalledVersionStatus item={item} />;
  } else if (status === 'upgrade_available') {
    return <UpgradeAvailableVersionStatus item={item} />;
  } else if (status === 'upgrade_failed') {
    return <InstallUpgradeFailedVersionStatus isUpgradeFailed={true} item={item} />;
  } else if (status === 'install_failed') {
    return <InstallUpgradeFailedVersionStatus isUpgradeFailed={false} item={item} />;
  } else return null;
});
