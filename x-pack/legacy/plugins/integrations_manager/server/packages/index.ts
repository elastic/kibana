/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, ScopedClusterClient } from 'src/core/server/';
import { AssetType, Installable, Installation, Request } from '../../common/types';

export * from './get';
export * from './install';
export * from './remove';
export * from './handlers';

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

export const SAVED_OBJECT_TYPES = new Set<AssetType>([
  'config',
  'dashboard',
  'index-pattern',
  'search',
  'timelion-sheet',
  'visualization',
]);

export function getClusterAccessor(esClient: IClusterClient, req: Request) {
  return esClient.asScoped(req).callAsCurrentUser;
}

export function createInstallableFrom<T>(from: T, savedObject?: Installation): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: 'installed',
        savedObject,
      }
    : {
        ...from,
        status: 'not_installed',
      };
}

export function assetUsesObjects(assetType: AssetType) {
  return SAVED_OBJECT_TYPES.has(assetType);
}
