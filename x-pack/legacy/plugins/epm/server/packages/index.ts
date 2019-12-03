/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AssetType,
  // ElasticsearchAssetType,
  Installable,
  Installation,
  InstallationStatus,
  KibanaAssetType,
} from '../../common/types';

export * from './get';
export * from './install';
export * from './remove';
export * from './handlers';

// only Kibana Assets use Saved Objects at this point
export const savedObjectTypes: AssetType[] = Object.values(KibanaAssetType);

export function createInstallableFrom<T>(from: T, savedObject?: Installation): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: InstallationStatus.installed,
        savedObject,
      }
    : {
        ...from,
        status: InstallationStatus.notInstalled,
      };
}
