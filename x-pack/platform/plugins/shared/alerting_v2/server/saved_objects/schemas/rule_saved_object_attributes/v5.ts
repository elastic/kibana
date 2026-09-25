/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV1 } from './v1';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV4 } from './v4';

/**
 * v5 moves the server-managed version counter out of `metadata` and up to the
 * attributes root. `metadata` goes back to carrying only client-supplied fields,
 * which keeps it aligned with the API's `metadata` object now that the counter
 * is no longer returned over HTTP. The field stays optional so rules written
 * before the migration remain valid; readers fall back to
 * `RULE_VERSION_FALLBACK`.
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV4.extends({
  metadata: ruleMetadataSchemaV1,
  version: schema.maybe(schema.number()),
});
