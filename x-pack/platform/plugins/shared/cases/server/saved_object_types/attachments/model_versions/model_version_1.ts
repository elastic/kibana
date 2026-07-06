/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { MAX_ALERTS_PER_CASE, MAX_COMMENT_LENGTH } from '../../../../common/constants';

// The SO mapping uses `dynamic: false`, so only a subset of attributes is indexed.
// The `create` schema must declare every indexed field (see
// `kbn-check-saved-objects-cli` validateAllMappingsInModelVersion), so we mirror
// the mapping here while keeping the wrapping objects permissive via
// `unknowns: 'allow'` to accommodate the unified payload variations
// (reference vs value attachments, metadata, pushed_by, updated_by, etc.).

// Bounds reuse existing cases conventions where they exist. `attachmentId`
// (string): 512 = ES `_id` upper bound, covering every current producer
// (alert/event ES ids, foreign SO UUIDs). `attachmentId` (array): reuses
// MAX_ALERTS_PER_CASE. `username`: matches Kibana security plugin routes.
const MAX_OWNER_LENGTH = 30;
const MAX_ISO_DATE_LENGTH = 30;
const MAX_ATTACHMENT_TYPE_LENGTH = 50;
const MAX_ATTACHMENT_ID_LENGTH = 512;
const MAX_USERNAME_LENGTH = 1024;

const userSchema = schema.object(
  {
    username: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_USERNAME_LENGTH }))),
  },
  { unknowns: 'allow' }
);

const dataSchema = schema.object(
  {
    content: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_COMMENT_LENGTH }))),
  },
  { unknowns: 'allow' }
);

const createSchema = schema.object(
  {
    type: schema.string({ maxLength: MAX_ATTACHMENT_TYPE_LENGTH }),
    attachmentId: schema.maybe(
      schema.oneOf([
        schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
        schema.arrayOf(schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }), {
          maxSize: MAX_ALERTS_PER_CASE,
        }),
      ])
    ),
    owner: schema.string({ maxLength: MAX_OWNER_LENGTH }),
    data: schema.maybe(schema.nullable(dataSchema)),
    created_at: schema.string({ maxLength: MAX_ISO_DATE_LENGTH }),
    created_by: userSchema,
    pushed_at: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_ISO_DATE_LENGTH }))),
    updated_at: schema.maybe(schema.nullable(schema.string({ maxLength: MAX_ISO_DATE_LENGTH }))),
  },
  { unknowns: 'allow' }
);

/** Baseline model version anchoring `cases-attachments`. */
export const modelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: createSchema,
  },
};
