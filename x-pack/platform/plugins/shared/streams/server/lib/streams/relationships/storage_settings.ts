/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  RELATIONSHIP_UUID,
  FROM_STREAM,
  TO_STREAM,
  RELATIONSHIP_DESCRIPTION,
  RELATIONSHIP_DIRECTION,
  RELATIONSHIP_SOURCE,
  RELATIONSHIP_CONFIDENCE,
  RELATIONSHIP_UPDATED_AT,
} from './fields';

export const relationshipStorageSettings = {
  name: '.kibana_streams_relationships',
  schema: {
    properties: {
      [RELATIONSHIP_UUID]: types.keyword(),
      [FROM_STREAM]: types.keyword(),
      [TO_STREAM]: types.keyword(),
      [RELATIONSHIP_DESCRIPTION]: types.text(),
      [RELATIONSHIP_DIRECTION]: types.keyword(),
      [RELATIONSHIP_SOURCE]: types.keyword(),
      [RELATIONSHIP_CONFIDENCE]: types.float(),
      [RELATIONSHIP_UPDATED_AT]: types.date(),
    },
  },
} satisfies IndexStorageSettings;

export type RelationshipStorageSettings = typeof relationshipStorageSettings;
