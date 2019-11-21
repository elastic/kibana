/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, ScopedClusterClient } from 'src/core/server/';
import {
  AssetType,
  ElasticsearchAssetType,
  InstallationStatus,
  KibanaAssetType,
} from '../../common/types';
import { Installable, Installation, Request } from '../types';

export * from './get';
export * from './install';
export * from './remove';
export * from './handlers';

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

// merge the values of the two types together, currently encompasses all types
// can add a `.filter` or create from individual `enum` members if/when that changes
export const savedObjectTypes: AssetType[] = [
  ...Object.values(KibanaAssetType),
  ...Object.values(ElasticsearchAssetType),
];

export function getClusterAccessor(esClient: IClusterClient, req: Request) {
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
