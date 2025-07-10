/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { sendGetPackageInfoByKeyForRq, sendInstallKibanaAssetsForRq } from '../../../hooks';

export async function ensurePackageKibanaAssetsInstalled({
  pkgName,
  pkgVersion,
  toasts,
  ...rest
}: {
  pkgName: string;
  pkgVersion: string;
  toasts: IToasts;
} & ({ currentSpaceId: string } | { spaceIds: string[] })) {
  try {
    const packageInfo = await sendGetPackageInfoByKeyForRq(pkgName, pkgVersion, {
      prerelease: true,
    });

    const installationInfo = packageInfo.item.installationInfo;
    if (!installationInfo) {
      // Skip if package is not installed
      return;
    }

    const kibanaAssetsSpaces = [
      installationInfo.installed_kibana_space_id ?? DEFAULT_SPACE_ID,
      ...Object.keys(installationInfo.additional_spaces_installed_kibana ?? {}),
    ];

    if ('currentSpaceId' in rest) {
      if (kibanaAssetsSpaces.includes(rest.currentSpaceId)) {
        return;
      }
      await sendInstallKibanaAssetsForRq({
        pkgName: installationInfo.name,
        pkgVersion: installationInfo.version,
      });
    } else {
      const missingSpaceIds = rest.spaceIds.filter(
        (spaceId) => !kibanaAssetsSpaces.includes(spaceId)
      );
      if (!missingSpaceIds.length) {
        return;
      }
      await sendInstallKibanaAssetsForRq({
        pkgName: installationInfo.name,
        pkgVersion: installationInfo.version,
        spaceIds: missingSpaceIds,
      });
    }
    toasts.addSuccess(
      i18n.translate('xpack.fleet.installKibanaAssets.successNotificationTitle', {
        defaultMessage: 'Successfully installed kibana assets for {pkgName}',
        values: {
          pkgName: installationInfo.name,
        },
      })
    );
  } catch (err) {
    toasts.addError(err, {
      title: i18n.translate('xpack.fleet.installKibanaAssets.errorNotificationTitle', {
        defaultMessage: 'Unable to install kibana assets for {pkgName}',
        values: {
          pkgName,
        },
      }),
    });
  }
}
