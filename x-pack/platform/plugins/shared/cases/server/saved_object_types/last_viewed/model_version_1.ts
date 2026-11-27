/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MAX_LAST_VIEWED_ENTRIES, MAX_LAST_VIEWED_KEY_LENGTH } from '../../../common/constants';

export const lastViewedSchema = schema.object({
  entries: schema.arrayOf(
    schema.object({
      key: schema.string({ maxLength: MAX_LAST_VIEWED_KEY_LENGTH }),
      viewedAt: schema.string({ maxLength: 30 }),
      seenAt: schema.nullable(schema.string({ maxLength: 30 })),
    }),
    { maxSize: MAX_LAST_VIEWED_ENTRIES }
  ),
});

export const modelVersion1: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    create: lastViewedSchema,
    forwardCompatibility: lastViewedSchema.extends({}, { unknowns: 'ignore' }),
  },
};
