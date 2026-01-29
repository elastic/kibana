/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  INSIGHT_ID,
  INSIGHT_TITLE,
  INSIGHT_DESCRIPTION,
  INSIGHT_IMPACT,
  INSIGHT_EVIDENCE,
  INSIGHT_RECOMMENDATIONS,
  INSIGHT_STATUS,
  INSIGHT_CREATED_AT,
  INSIGHT_UPDATED_AT,
} from './fields';

export const insightStorageSettings = {
  name: '.kibana_streams_insights',
  schema: {
    properties: {
      [INSIGHT_ID]: types.keyword(),
      [INSIGHT_TITLE]: types.text(),
      [INSIGHT_DESCRIPTION]: types.text(),
      [INSIGHT_IMPACT]: types.keyword(),
      [INSIGHT_EVIDENCE]: types.object({ enabled: false }),
      [INSIGHT_RECOMMENDATIONS]: types.keyword(),
      [INSIGHT_STATUS]: types.keyword(),
      [INSIGHT_CREATED_AT]: types.date(),
      [INSIGHT_UPDATED_AT]: types.date(),
    },
  },
} satisfies IndexStorageSettings;

export type InsightStorageSettings = typeof insightStorageSettings;
