/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { BOOST_SAVED_OBJECT_TYPE } from '../../common/constants';

// Only `kind` is indexed; the rest of each document mirrors `_boost` API payloads and is stored as-is.
const boostPrototypeSchemaV1 = schema.object(
  {
    kind: schema.oneOf([
      schema.literal('settings'),
      schema.literal('profile'),
      schema.literal('rule'),
      schema.literal('sample_data'),
      schema.literal('prototype_settings'),
    ]),
  },
  { unknowns: 'allow' }
);

export const boostPrototypeSavedObjectType: SavedObjectsType = {
  name: BOOST_SAVED_OBJECT_TYPE,
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      kind: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: boostPrototypeSchemaV1,
        forwardCompatibility: boostPrototypeSchemaV1,
      },
    },
  },
};
