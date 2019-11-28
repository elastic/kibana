/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useState, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { PackageInfo } from '../../../common/types';
import { InstallStatus } from '../../types';
import { ConfirmPackageInstall } from './confirm_package_install';
import { ConfirmPackageDelete } from './confirm_package_delete';
import { useDeletePackage, useInstallPackage, useGetPackageInstallStatus } from '../../hooks';

interface InstallationButtonProps {
  package: PackageInfo;
}

export function InstallationButton(props: InstallationButtonProps) {
  const { assets, name, title, version } = props.package;
  const installPackage = useInstallPackage();
  const deletePackage = useDeletePackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const installationStatus = getPackageInstallStatus(name);

  const isInstalling = installationStatus === InstallStatus.installing;
  const isRemoving = installationStatus === InstallStatus.uninstalling;
  const isInstalled = installationStatus === InstallStatus.installed;

  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const toggleModal = useCallback(() => {
    setModalVisible(!isModalVisible);
  }, [isModalVisible]);

  const handleClickInstall = useCallback(() => {
    installPackage({ name, version, title });
    toggleModal();
  }, [installPackage, name, title, toggleModal, version]);

  const handleClickDelete = useCallback(() => {
    deletePackage({ name, version, title });
    toggleModal();
  }, [deletePackage, name, title, toggleModal, version]);

  const numOfAssets = useMemo(
    () =>
      Object.entries(assets).reduce(
        (acc, [serviceName, serviceNameValue]) =>
          acc +
          Object.entries(serviceNameValue).reduce(
            (acc2, [assetName, assetNameValue]) => acc2 + assetNameValue.length,
            0
          ),
        0
      ),
    [assets]
  );

  const installButton = (
    <EuiButton isLoading={isInstalling} fill={true} onClick={toggleModal}>
      {isInstalling ? 'Installing' : 'Install package'}
    </EuiButton>
  );

  const installedButton = (
    <EuiButton isLoading={isRemoving} fill={true} onClick={toggleModal} color="danger">
      {isInstalling ? 'Deleting' : 'Delete package'}
    </EuiButton>
  );

  const deletionModal = (
    <ConfirmPackageDelete
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleModal}
      onConfirm={handleClickDelete}
    />
  );

  const installationModal = (
    <ConfirmPackageInstall
      numOfAssets={numOfAssets}
      packageName={title}
      onCancel={toggleModal}
      onConfirm={handleClickInstall}
    />
  );

  return (
    <Fragment>
      {isInstalled ? installedButton : installButton}
      {isModalVisible && (isInstalled ? deletionModal : installationModal)}
    </Fragment>
  );
}
