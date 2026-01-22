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
  SYSTEM_DESCRIPTION,
  SYSTEM_FILTER,
  SYSTEM_NAME,
  SYSTEM_TYPE,
  SYSTEM_UUID,
} from './fields';

export const systemStorageSettings = {
  name: '.kibana_streams_systems',
  schema: {
    properties: {
      [SYSTEM_UUID]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [SYSTEM_TYPE]: types.keyword(),
      [SYSTEM_NAME]: types.keyword(),
      [SYSTEM_DESCRIPTION]: types.text(),
      [SYSTEM_FILTER]: types.object({ enabled: false }),
    },
  },
} satisfies IndexStorageSettings;

export type SystemStorageSettings = typeof systemStorageSettings;
