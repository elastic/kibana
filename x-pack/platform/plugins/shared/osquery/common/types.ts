/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const savedQuerySavedObjectType = 'osquery-saved-query';
export const packSavedObjectType = 'osquery-pack';
export const packAssetSavedObjectType = 'osquery-pack-asset';
export const usageMetricSavedObjectType = 'osquery-manager-usage-metric';

export type {
  EndpointAssetDocument,
  EndpointAssetEntity,
  EndpointAssetInfo,
  EndpointAssetHost,
  EndpointAssetAgent,
  EndpointAssetLifecycle,
  EndpointAssetHardware,
  EndpointAssetNetwork,
  EndpointAssetNetworkInterface,
  EndpointAssetSoftware,
  EndpointAssetPosture,
  EndpointAssetPostureChecks,
  EndpointAssetPrivileges,
  EndpointAssetDrift,
  EndpointAssetQueries,
  EndpointAssetEndpoint,
  EndpointAssetEvent,
} from './types/endpoint_assets';

export { ENTITY_FIELDS, ASSET_FIELDS, ENDPOINT_FIELDS } from './types/endpoint_assets';
