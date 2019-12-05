/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, Fragment } from 'react';
import createContainer from 'constate';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { NotificationsStart } from 'src/core/public';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import { PackageInfo } from '../../common/types';
import { installPackage as fetchInstallPackage, removePackage } from '../data';
import { InstallStatus } from '../types';
import { useLinks } from '.';

interface PackagesInstall {
  [key: string]: PackageInstallItem;
}

interface PackageInstallItem {
  status: InstallStatus;
}

function usePackageInstall({ notifications }: { notifications: NotificationsStart }) {
  const [packages, setPackage] = useState<PackagesInstall>({});
  const { toAddDataSourceView } = useLinks();

  const setPackageInstallStatus = useCallback(
    ({ name, status }: { name: PackageInfo['name']; status: InstallStatus }) => {
      setPackage((prev: PackagesInstall) => ({
        ...prev,
        [name]: { status },
      }));
    },
    []
  );

  const installPackage = useCallback(
    async ({ name, version, title }: Pick<PackageInfo, 'name' | 'version' | 'title'>) => {
      setPackageInstallStatus({ name, status: InstallStatus.installing });
      const pkgkey = `${name}-${version}`;

      try {
        await fetchInstallPackage(pkgkey);
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        const packageDataSourceUrl = toAddDataSourceView({ name, version });
        const SuccessMsg = (
          <Fragment>
            <p>Next, create a data source to begin sending data to your Elasticsearch cluster.</p>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                {/* Would like to add a loading indicator here but, afaict,
                 notifications are static. i.e. they won't re-render with new state */}
                <EuiButton href={packageDataSourceUrl} size="s">
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
    [notifications.toasts, setPackageInstallStatus, toAddDataSourceView]
  );

  const getPackageInstallStatus = useCallback(
    (pkg: string): InstallStatus => {
      return packages[pkg].status;
    },
    [packages]
  );

  const deletePackage = useCallback(
    async ({ name, version, title }: Pick<PackageInfo, 'name' | 'version' | 'title'>) => {
      setPackageInstallStatus({ name, status: InstallStatus.uninstalling });
      const pkgkey = `${name}-${version}`;

      try {
        await removePackage(pkgkey);
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });

        const SuccessMsg = <p>Successfully deleted {title}</p>;

        notifications.toasts.addSuccess({
          title: `Deleted ${title} package`,
          text: toMountPoint(SuccessMsg),
        });
      } catch (err) {
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        notifications.toasts.addWarning({
          title: `Failed to delete ${title} package`,
          text: 'Something went wrong while trying to delete this package. Please try again later.',
          iconType: 'alert',
        });
      }
    },
    [notifications.toasts, setPackageInstallStatus]
  );

  return {
    packages,
    installPackage,
    setPackageInstallStatus,
    getPackageInstallStatus,
    deletePackage,
  };
}

export const [
  PackageInstallProvider,
  useInstallPackage,
  useSetPackageInstallStatus,
  useGetPackageInstallStatus,
  useDeletePackage,
] = createContainer(
  usePackageInstall,
  value => value.installPackage,
  value => value.setPackageInstallStatus,
  value => value.getPackageInstallStatus,
  value => value.deletePackage
);
