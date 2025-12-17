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
  FEATURE_FILTER,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_UUID,
} from './fields';

export const featureStorageSettings = {
  // Initially features were called systems, for backward compatibility we need to keep the same index name
  name: '.kibana_streams_systems',
  schema: {
    properties: {
      [FEATURE_UUID]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [FEATURE_TYPE]: types.keyword(),
      [FEATURE_NAME]: types.keyword(),
      [FEATURE_DESCRIPTION]: types.text(),
      [FEATURE_FILTER]: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export type FeatureStorageSettings = typeof featureStorageSettings;
