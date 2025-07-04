/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { Fragment, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo, UpgradePackagePolicyDryRunResponse } from '../../../../../types';
import { InstallStatus } from '../../../../../types';
import { useAuthz, useGetPackageInstallStatus, useInstallPackage } from '../../../../../hooks';

import { getNumTransformAssets } from '../../../../../../../components/transform_install_as_current_user_callout';

import { ConfirmPackageInstall } from './confirm_package_install';

type InstallationButtonProps = Pick<PackageInfo, 'name' | 'title' | 'version' | 'assets'> & {
  disabled?: boolean;
  dryRunData?: UpgradePackagePolicyDryRunResponse | null;
  isUpgradingPackagePolicies?: boolean;
  latestVersion?: string;
  packagePolicyIds?: string[];
  setIsUpgradingPackagePolicies?: React.Dispatch<React.SetStateAction<boolean>>;
};
export function InstallButton(props: InstallationButtonProps) {
  const { name, title, version, assets } = props;

  const canInstallPackages = useAuthz().integrations.installPackages;
  const installPackage = useInstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);

  const numOfAssets = Object.entries(assets).reduce(
    (acc, [serviceName, serviceNameValue]) =>
      acc +
      Object.entries(serviceNameValue || {}).reduce(
        (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
        0
      ),
    0
  );
  const numOfTransformAssets = getNumTransformAssets(assets);

  const isInstalling = installationStatus === InstallStatus.installing;
  const [isInstallModalVisible, setIsInstallModalVisible] = useState<boolean>(false);
  const toggleInstallModal = useCallback(() => {
    setIsInstallModalVisible(!isInstallModalVisible);
  }, [isInstallModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleInstallModal();
  }, [installPackage, name, title, toggleInstallModal, version]);

  const installModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      numOfTransformAssets={numOfTransformAssets}
      packageName={title}
      onCancel={toggleInstallModal}
      onConfirm={handleClickInstall}
    />
  );

  return canInstallPackages ? (
    <Fragment>
      <EuiButton
        iconType={'importAction'}
        isLoading={isInstalling}
        onClick={toggleInstallModal}
        data-test-subj="installAssetsButton"
      >
        {isInstalling ? (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.installingPackageButtonLabel"
            defaultMessage="Installing {title}"
            values={{
              title,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.integrations.installPackage.installPackageButtonLabel"
            defaultMessage="Install {title}"
            values={{
              title,
            }}
          />
        )}
      </EuiButton>

      {isInstallModalVisible && installModal}
    </Fragment>
  ) : null;
}
