/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { InstallStatus } from '../../../../../types';
import type { PackageInfo } from '../../../../../types';
import type { InstallationInfo } from '../../../../../../../../common/types';

import { useAuthz, useGetPackageInstallStatus, useUninstallPackage } from '../../../../../hooks';

import { ConfirmPackageUninstall } from './confirm_package_uninstall';

interface UninstallButtonProps extends Pick<PackageInfo, 'name' | 'title' | 'version'> {
  disabled?: boolean;
  installationInfo?: InstallationInfo;
  latestVersion?: string;
}

export const UninstallButton: React.FunctionComponent<UninstallButtonProps> = ({
  disabled = false,
  latestVersion,
  name,
  installationInfo,
  title,
  version,
}) => {
  const canRemovePackages = useAuthz().integrations.removePackages;
  const uninstallPackage = useUninstallPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(name);
  const isRemoving = installationStatus === InstallStatus.uninstalling;

  const [isUninstallModalVisible, setIsUninstallModalVisible] = useState<boolean>(false);

  const numOfAssets =
    (installationInfo?.installed_kibana?.length ?? 0) +
    (installationInfo?.installed_es?.length ?? 0);

  const handleClickUninstall = useCallback(() => {
    uninstallPackage({ name, version, title, redirectToVersion: latestVersion ?? version });
    setIsUninstallModalVisible(false);
  }, [uninstallPackage, name, title, version, latestVersion]);

  const uninstallModal = (
    <ConfirmPackageUninstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={() => setIsUninstallModalVisible(false)}
      onConfirm={handleClickUninstall}
    />
  );

  return canRemovePackages ? (
    <>
      <EuiButton
        data-test-subj="uninstallAssetsButton"
        iconType={'trash'}
        isLoading={isRemoving}
        onClick={() => setIsUninstallModalVisible(true)}
        color="danger"
        disabled={disabled || isRemoving ? true : false}
      >
        {isRemoving ? (
          <FormattedMessage
            id="xpack.fleet.integrations.uninstallPackage.uninstallingPackageButtonLabel"
            defaultMessage="Uninstalling {title}"
            values={{
              title,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.integrations.uninstallPackage.uninstallPackageButtonLabel"
            defaultMessage="Uninstall {title}"
            values={{
              title,
            }}
          />
        )}
      </EuiButton>
      {isUninstallModalVisible && uninstallModal}
    </>
  ) : null;
};
