/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { MAX_REPORTED_ERRORS, STATUS_SAVED_OBJECT_TYPE } from '../../common';

const kindResultSchema = schema.object({
  applied: schema.number(),
  created: schema.maybe(schema.number()),
  unchanged: schema.maybe(schema.number()),
  failed: schema.number(),
  pruned: schema.maybe(schema.number()),
});

const statusAttributesSchema = schema.object({
  hash: schema.nullable(schema.string({ maxLength: 64 })),
  status: schema.oneOf([
    schema.literal('running'),
    schema.literal('completed'),
    schema.literal('failed'),
  ]),
  startedAt: schema.maybe(schema.string()),
  finishedAt: schema.maybe(schema.string()),
  kinds: schema.recordOf(schema.string(), kindResultSchema),
  errors: schema.arrayOf(
    schema.object({
      kind: schema.maybe(schema.string()),
      spaceId: schema.maybe(schema.string()),
      id: schema.maybe(schema.string()),
      message: schema.string(),
    }),
    { maxSize: MAX_REPORTED_ERRORS }
  ),
  coveredRequestNumber: schema.maybe(schema.number({ min: 0 })),
  settingsHash: schema.maybe(schema.string({ maxLength: 64 })),
  finishedRequestNumber: schema.maybe(schema.number({ min: 1 })),
  revision: schema.maybe(schema.number({ min: 0 })),
});

/** Single document describing the latest run; only read by id, so nothing is indexed. */
export const statusSavedObjectType: SavedObjectsType = {
  name: STATUS_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: statusAttributesSchema.extends({}, { unknowns: 'ignore' }),
        create: statusAttributesSchema,
      },
    },
  },
};
