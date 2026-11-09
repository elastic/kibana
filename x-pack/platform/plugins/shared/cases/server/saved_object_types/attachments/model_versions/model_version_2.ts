/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_MENTIONS_PER_ATTACHMENT,
  MAX_USERNAME_LENGTH,
} from '../../../../common/constants';
import { createSchema as createSchemaV1 } from './model_version_1';

const createSchema = createSchemaV1.extends({
  parent_id: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }))),
  mentions: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: MAX_USERNAME_LENGTH }), {
      maxSize: MAX_MENTIONS_PER_ATTACHMENT,
    })
  ),
  deleted: schema.maybe(schema.boolean()),
});

/**
 * Indexes `parent_id` (threaded replies), `mentions` (profile uids referenced in the content)
 * and `deleted` (soft-deleted thread parents).
 */
export const modelVersion2: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        parent_id: { type: 'keyword', ignore_above: 1024 },
        mentions: { type: 'keyword', ignore_above: 1024 },
        deleted: { type: 'boolean' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: createSchema,
  },
};
