/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import {
  MAX_ISO_DATE_LENGTH,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_PAIRS,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OWNER_LENGTH,
  MAX_STORED_OBSERVABLE_FIELD_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../../../common/constants';

// The mapping uses `dynamic: false`, so the `create` schema declares every indexed field (see
// `kbn-check-saved-objects-cli` validateAllMappingsInModelVersion) and allows the unindexed ones.

const userSchema = schema.object(
  {
    username: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_USERNAME_LENGTH }))),
  },
  { unknowns: 'allow' }
);

const createSchema = schema.object(
  {
    owner: schema.string({ maxLength: MAX_OWNER_LENGTH }),
    type_key: schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH }),
    value: schema.string({ maxLength: MAX_STORED_OBSERVABLE_FIELD_LENGTH }),
    metadata: schema.recordOf(
      schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_METADATA_KEY_LENGTH }),
      schema.string({ maxLength: MAX_OBSERVABLE_METADATA_VALUE_LENGTH }),
      {
        validate: (metadata) =>
          Object.keys(metadata).length > MAX_OBSERVABLE_METADATA_PAIRS
            ? `metadata holds at most ${MAX_OBSERVABLE_METADATA_PAIRS} pairs`
            : undefined,
      }
    ),
    created_at: schema.string({ maxLength: MAX_ISO_DATE_LENGTH }),
    created_by: userSchema,
    updated_at: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_ISO_DATE_LENGTH }))),
    updated_by: schema.maybe(schema.nullable(userSchema)),
  },
  { unknowns: 'allow' }
);

/** Baseline model version of `cases-observable-shared`. */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: createSchema,
  },
};
