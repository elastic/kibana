/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterClient, ScopedClusterClient } from 'src/core/server/';
import { AssetTypes, InstallationStatus } from '../../common/constants';
import { Installable, Installation, Request } from '../../common/types';

export * from './get';
export * from './install';
export * from './remove';
export * from './handlers';

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

enum SavedObjectTypes {
  config = AssetTypes.config,
  dashboard = AssetTypes.dashboard,
  indexPattern = AssetTypes.indexPattern,
  search = AssetTypes.search,
  timelionSheet = AssetTypes.timelionSheet,
  visualization = AssetTypes.visualization,
}

export function getClusterAccessor(esClient: ClusterClient, req: Request) {
  return esClient.asScoped(req).callAsCurrentUser;
}

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

export function assetUsesObjects(asset: string) {
  const values = Object.values(SavedObjectTypes);
  return values.includes(asset);
}
