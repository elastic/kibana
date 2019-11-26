/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';
import createContainer from 'constate';
import { useCore } from './';
import { installPackage as fetchInstallPackage } from '../data';
import { InstallStatus } from '../types';

interface PackagesInstall {
  [key: string]: PackageInstallItem;
}
interface PackageInstallItem {
  status: InstallStatus;
}
function usePackageInstall() {
  const [packages, setPackage] = useState<PackagesInstall>({});
  const { notifications } = useCore();

  const installPackage = useCallback(
    async ({ name, version, title }: { name: string; version: string; title: string }) => {
      setPackageInstallStatus({ name, status: InstallStatus.installing });
      const pkgkey = `${name}-${version}`;
      try {
        await fetchInstallPackage(pkgkey);
        setPackageInstallStatus({ name, status: InstallStatus.installed });
        notifications.toasts.addSuccess({
          title: `Installed ${title}`,
          text: 'Next, create a data source to begin sending data to your Elasticsearch cluster.',
        });
      } catch (err) {
        setPackageInstallStatus({ name, status: InstallStatus.notInstalled });
        notifications.toasts.addDanger(`There was a problem installing ${title}`);
      }
    },
    [notifications.toasts, setPackageInstallStatus]
  );

  const setPackageInstallStatus = useCallback(
    ({ name, status }: { name: string; status: InstallStatus }) => {
      setPackage((prev: PackagesInstall) => ({
        ...prev,
        [name]: { status },
      }));
    },
    []
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
