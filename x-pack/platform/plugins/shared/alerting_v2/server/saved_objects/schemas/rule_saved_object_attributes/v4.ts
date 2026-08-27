/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';
import { ruleMetadataSchema as ruleMetadataSchemaV2 } from './v2';

/**
 * v4 adds optional `metadata.source`, a framework-agnostic envelope that
 * tracks the originating rule spec or content pack. The shape follows the
 * same rationale as artifacts: `{ type, data }` where `type` is a
 * discriminator and `data` is a per-type payload the framework does not
 * interpret. Pre-existing (user-authored) rules have no source; no backfill.
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV3.extends({
  metadata: ruleMetadataSchemaV2.extends({
    source: schema.maybe(
      schema.object({
        type: schema.string(),
        data: schema.recordOf(schema.string(), schema.any()),
      })
    ),
  }),
});
