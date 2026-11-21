/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const actorSchema = schema.nullable(
  schema.object({ profile_uid: schema.nullable(schema.string({ maxLength: 256 })) })
);

const tagsSchema = schema.maybe(
  schema.arrayOf(schema.string({ maxLength: 128 }), { minSize: 1, maxSize: 100 })
);

/**
 * Saved object attributes for an alert import: the configuration of one source of external
 * alerts, such as a Datadog connector that receives events.
 *
 * The connector is stored twice. `connector_id` is the attribute, and the saved object also
 * carries a `connector` reference of type `action`, so Kibana can follow the link, warn before
 * the connector is deleted and rewrite the id on import and copy to space. Readers resolve
 * `connector_id` from the reference, which is the source of truth.
 *
 * There is no `enabled` attribute. Whether an import is on comes from the connector's
 * `is_inbound_events_enabled` setting.
 */
export const importConfigAttributesSchemaV1 = schema.object({
  kind: schema.oneOf([schema.literal('alert'), schema.literal('signal')]),
  metadata: schema.object({
    name: schema.string({ maxLength: 256 }),
    description: schema.maybe(schema.string({ maxLength: 1024 })),
    tags: tagsSchema,
    routing_tags: tagsSchema,
  }),
  connector_id: schema.string({ maxLength: 256 }),

  // Server-managed
  version: schema.number(),
  createdBy: actorSchema,
  updatedBy: actorSchema,
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
