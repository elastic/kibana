/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, Fragment } from 'react';
import createContainer from 'constate';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { NotificationsStart } from 'src/core/public';
import { installPackage as fetchInstallPackage, installDatasource } from '../data';
import { InstallStatus } from '../types';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

interface PackagesInstall {
  [key: string]: PackageInstallItem;
}
interface PackageInstallItem {
  status: InstallStatus;
}
function usePackageInstall({ notifications }: { notifications: NotificationsStart }) {
  const [packages, setPackage] = useState<PackagesInstall>({});

  const setPackageInstallStatus = useCallback(
    ({ name, status }: { name: string; status: InstallStatus }) => {
      setPackage((prev: PackagesInstall) => ({
        ...prev,
        [name]: { status },
      }));
    },
    []
  );

  const installPackage = useCallback(
    async ({ name, version, title }: { name: string; version: string; title: string }) => {
      setPackageInstallStatus({ name, status: InstallStatus.installing });
      const pkgkey = `${name}-${version}`;

      try {
        await fetchInstallPackage(pkgkey);
        setPackageInstallStatus({ name, status: InstallStatus.installed });

        const SuccessMsg = (
          <Fragment>
            <p>Next, create a data source to begin sending data to your Elasticsearch cluster.</p>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => installDatasource(pkgkey)} size="s">
                  Add data source
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        );

        notifications.toasts.addSuccess({
          title: `Installed ${title} package`,
          text: toMountPoint(SuccessMsg),
        });
      } catch (err) {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });
        notifications.toasts.addWarning({
          title: `Failed to install ${title} package`,
          text:
            'Something went wrong while trying to install this package. Please try again later.',
          iconType: 'alert',
        });
      }
    },
    [notifications.toasts, setPackageInstallStatus]
  );

  const getPackageInstallStatus = useCallback(
    (pkg: string): InstallStatus => {
      return packages[pkg].status;
    },
    [packages]
  );

  return { packages, installPackage, setPackageInstallStatus, getPackageInstallStatus };
}

export const [
  PackageInstallProvider,
  useInstallPackage,
  useSetPackageInstallStatus,
  useGetPackageInstallStatus,
] = createContainer(
  usePackageInstall,
  value => value.installPackage,
  value => value.setPackageInstallStatus,
  value => value.getPackageInstallStatus
);
