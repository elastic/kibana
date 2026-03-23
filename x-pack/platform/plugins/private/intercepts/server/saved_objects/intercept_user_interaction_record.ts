/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { InferObjectSchema } from './types';

const interceptInteractionV1 = schema.object({
  userId: schema.string(),
  triggerId: schema.string(),
  metadata: schema.object(
    {
      lastInteractedInterceptId: schema.number(),
    },
    { unknowns: 'allow' }
  ),
});

export type InterceptInteractionUserRecordAttributes = InferObjectSchema<
  typeof interceptInteractionV1
>;

export const interceptInteractionUserRecordSavedObject: SavedObjectsType = {
  name: 'intercept_interaction_record',
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: interceptInteractionV1.extends({}, { unknowns: 'ignore' }),
        create: interceptInteractionV1,
      },
    },
  },
};
