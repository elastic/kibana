/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const actorSchema = schema.nullable(
  schema.object({ profile_uid: schema.nullable(schema.string()) })
);

export const importConfigAttributesSchemaV1 = schema.object({
  name: schema.string(),
  description: schema.maybe(schema.string()),
  // `custom` imports own a webhook connector and a generated workflow. `managed` imports sit on
  // the user's own vendor connector and a shared managed workflow.
  kind: schema.oneOf([schema.literal('custom'), schema.literal('managed')], {
    defaultValue: 'custom',
  }),
  enabled: schema.boolean(),
  source: schema.string(),
  connector_id: schema.string(),
  // Optional and not mapped (the mappings are `dynamic: false`): only read back from `_source`.
  connector_type_id: schema.maybe(schema.string()),
  workflow_id: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  // Stored for later, nothing reads them yet.
  routing_tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  default_severity: schema.maybe(schema.string()),
  owner: schema.maybe(schema.string()),
  external_config_url: schema.maybe(schema.string()),
  fingerprint_field: schema.maybe(schema.string()),
  created_by: actorSchema,
  updated_by: actorSchema,
  created_at: schema.string(),
  updated_at: schema.string(),
});
