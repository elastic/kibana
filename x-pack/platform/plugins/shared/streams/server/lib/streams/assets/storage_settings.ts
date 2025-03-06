/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexStorageSettings, types } from '@kbn/storage-adapter';
import { ASSET_ASSET_ID, ASSET_ENTITY_ID, ASSET_ENTITY_TYPE, ASSET_TYPE } from './fields';

export const assetStorageSettings = {
  name: '.kibana_streams_assets',
  schema: {
    properties: {
      [ASSET_ASSET_ID]: types.keyword(),
      [ASSET_TYPE]: types.keyword(),
      [ASSET_ENTITY_ID]: types.keyword(),
      [ASSET_ENTITY_TYPE]: types.keyword(),
    },
  },
} satisfies IndexStorageSettings;

export type AssetStorageSettings = typeof assetStorageSettings;
