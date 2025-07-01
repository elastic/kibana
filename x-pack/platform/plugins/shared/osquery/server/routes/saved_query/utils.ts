/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, filter, map, reduce } from 'lodash';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';

import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';

export const getInstalledSavedQueriesMap = async (
  packageService: PackageClient | undefined,
  savedObjectsClient: SavedObjectsClientContract,
  spaceId: string
) => {
  const installation = await packageService?.getInstallation(
    OSQUERY_INTEGRATION_NAME,
    savedObjectsClient
  );

  if (installation) {
    let installedSavedQueries: KibanaAssetReference[] = [];

    if ((installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID) === spaceId) {
      installedSavedQueries = installation.installed_kibana;
    } else if (installation.additional_spaces_installed_kibana?.[spaceId]) {
      installedSavedQueries = installation.additional_spaces_installed_kibana[spaceId];
    }

    return reduce<KibanaAssetReference, Record<string, KibanaAssetReference>>(
      installedSavedQueries,
      (acc, item) => {
        if (item.type === savedQuerySavedObjectType) {
          return { ...acc, [item.id]: item };
        }

        return acc;
      },
      {}
    );
  }

  return {};
};

export const getPrebuiltSavedQueryIds = async (packageService: PackageClient | undefined) => {
  const installation = await packageService?.getInstallation(OSQUERY_INTEGRATION_NAME);

  if (installation) {
    const installationSavedQueries = filter(
      installation.installed_kibana,
      (item) => item.type === savedQuerySavedObjectType
    );

    return map(installationSavedQueries, 'id');
  }

  return [];
};

export const isSavedQueryPrebuilt = async (
  packageService: PackageClient | undefined,
  savedQueryId: string,
  savedObjectsClient: SavedObjectsClientContract,
  spaceId: string
) => {
  const installation = await packageService?.getInstallation(
    OSQUERY_INTEGRATION_NAME,
    savedObjectsClient
  );

  if (installation) {
    let installedSavedQueries: KibanaAssetReference[] = [];

    if ((installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID) === spaceId) {
      installedSavedQueries = installation.installed_kibana;
    } else if (installation.additional_spaces_installed_kibana?.[spaceId]) {
      installedSavedQueries = installation.additional_spaces_installed_kibana[spaceId];
    }

    const installationSavedQueries = find(
      installedSavedQueries,
      (item) => item.type === savedQuerySavedObjectType && item.id === savedQueryId
    );

    return !!installationSavedQueries;
  }

  return false;
};
