/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  STREAM_NAME,
  FEATURE_DESCRIPTION,
  FEATURE_VALUE,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_UUID,
  FEATURE_TAGS,
  FEATURE_META,
} from './fields';

export const featureStorageSettings = {
  name: '.kibana_streams_features',
  schema: {
    properties: {
      [FEATURE_UUID]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [FEATURE_TYPE]: types.keyword(),
      [FEATURE_NAME]: types.keyword(),
      [FEATURE_DESCRIPTION]: types.text(),
      [FEATURE_VALUE]: types.object({ enabled: false }),
      [FEATURE_CONFIDENCE]: types.long(),
      [FEATURE_EVIDENCE]: types.keyword(),
      [FEATURE_STATUS]: types.keyword(),
      [FEATURE_LAST_SEEN]: types.date(),
      [FEATURE_TAGS]: types.keyword(),
      [FEATURE_META]: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export type FeatureStorageSettings = typeof featureStorageSettings;
