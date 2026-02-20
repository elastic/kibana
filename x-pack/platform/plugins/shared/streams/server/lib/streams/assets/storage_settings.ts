/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_KQL_BODY,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  RULE_BACKED,
  STREAM_NAME,
} from './fields';

/**
 * Storage settings for Significant Events queries.
 * Note: The index name ".kibana_streams_assets" is kept for backwards compatibility,
 * but this index is only used to store query assets (Significant Events queries linked to streams).
 */
export const queryStorageSettings = {
  name: '.kibana_streams_assets',
  schema: {
    properties: {
      [ASSET_UUID]: types.keyword(),
      [ASSET_ID]: types.keyword(),
      [ASSET_TYPE]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [QUERY_KQL_BODY]: types.match_only_text(),
      [QUERY_TITLE]: types.keyword(),
      [QUERY_SEVERITY_SCORE]: types.long(),
      [RULE_BACKED]: types.boolean(),
      experimental: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export type QueryStorageSettings = typeof queryStorageSettings;
