/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexStorageSettings, types } from '@kbn/storage-adapter';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_KQL_BODY,
  QUERY_TITLE,
  STREAM_NAME,
} from './fields';

export const assetStorageSettings = {
  name: '.kibana_streams_assets',
  schema: {
    properties: {
      [ASSET_UUID]: types.keyword(),
      [ASSET_ID]: types.keyword(),
      [ASSET_TYPE]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [QUERY_KQL_BODY]: types.match_only_text(),
      [QUERY_TITLE]: types.keyword(),
    },
  },
} satisfies IndexStorageSettings;

export type AssetStorageSettings = typeof assetStorageSettings;
