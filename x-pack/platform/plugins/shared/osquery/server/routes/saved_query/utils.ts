/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, filter, map, reduce } from 'lodash';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';

import type { PackageClient } from '@kbn/fleet-plugin/server';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';

export const getInstalledSavedQueriesMap = async (packageService: PackageClient | undefined) => {
  const installation = await packageService?.getInstallation(OSQUERY_INTEGRATION_NAME);

  if (installation) {
    return reduce<KibanaAssetReference, Record<string, KibanaAssetReference>>(
      installation.installed_kibana,
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
  savedQueryId: string
) => {
  const installation = await packageService?.getInstallation(OSQUERY_INTEGRATION_NAME);

  if (installation) {
    const installationSavedQueries = find(
      installation.installed_kibana,
      (item) => item.type === savedQuerySavedObjectType && item.id === savedQueryId
    );

    return !!installationSavedQueries;
  }

  return false;
};
