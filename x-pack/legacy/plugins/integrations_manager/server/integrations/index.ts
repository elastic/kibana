/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterClient, ScopedClusterClient } from 'src/core/server/';
import {
  ASSET_TYPE_CONFIG,
  ASSET_TYPE_DASHBOARD,
  ASSET_TYPE_INDEX_PATTERN,
  ASSET_TYPE_SEARCH,
  ASSET_TYPE_TIMELION_SHEET,
  ASSET_TYPE_VISUALIZATION,
  STATUS_INSTALLED,
  STATUS_NOT_INSTALLED,
} from '../../common/constants';
import { AssetType, Installable, Installation, Request } from '../../common/types';

export * from './get';
export * from './install';
export * from './remove';
export * from './handlers';

export type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

export type SavedObjectTypes =
  | typeof ASSET_TYPE_CONFIG
  | typeof ASSET_TYPE_DASHBOARD
  | typeof ASSET_TYPE_INDEX_PATTERN
  | typeof ASSET_TYPE_SEARCH
  | typeof ASSET_TYPE_TIMELION_SHEET
  | typeof ASSET_TYPE_VISUALIZATION;

export const SAVED_OBJECT_TYPES = new Set([
  ASSET_TYPE_CONFIG,
  ASSET_TYPE_DASHBOARD,
  ASSET_TYPE_INDEX_PATTERN,
  ASSET_TYPE_SEARCH,
  ASSET_TYPE_TIMELION_SHEET,
  ASSET_TYPE_VISUALIZATION,
]);

export function getClusterAccessor(esClient: ClusterClient, req: Request) {
  return esClient.asScoped(req).callAsCurrentUser;
}

export function createInstallableFrom<T>(from: T, savedObject?: Installation): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: STATUS_INSTALLED,
        savedObject,
      }
    : {
        ...from,
        status: STATUS_NOT_INSTALLED,
      };
}

export function assetUsesObjects(asset: AssetType) {
  return SAVED_OBJECT_TYPES.has(asset);
}
