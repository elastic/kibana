/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { FLEET_SCHEMA_ID_MAX_LENGTH } from '../../constants';

import { clientAuth } from '../../../common/types';

// Flat oneOf with null as an explicit alternative — nested oneOf prevents null from
// matching in @kbn/config-schema, so null must be a sibling alternative, not wrapped.
const nullableSecretRefSchema = schema.oneOf([
  schema.literal(null),
  schema.object({ id: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }) }),
  schema.string({ maxLength: 10000 }),
]);

export const FleetServerHostBaseSchema = schema.object({
  name: schema.maybe(schema.string({ maxLength: 255 })),
  host_urls: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 2048 }), { minSize: 1, maxSize: 10 })
  ),
  is_default: schema.maybe(schema.boolean({ defaultValue: false })),
  is_internal: schema.maybe(schema.boolean()),
  allow_edit: schema.maybe(schema.arrayOf(schema.string({ maxLength: 100 }), { maxSize: 100 })),
  proxy_id: schema.nullable(schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH })),
  secrets: schema.maybe(
    schema.object({
      ssl: schema.maybe(
        schema.object({
          key: schema.maybe(nullableSecretRefSchema),
          es_key: schema.maybe(nullableSecretRefSchema),
          agent_key: schema.maybe(nullableSecretRefSchema),
        })
      ),
    })
  ),
  ssl: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
        certificate_authorities: schema.maybe(
          schema.arrayOf(schema.string({ maxLength: 100000 }), { maxSize: 10 })
        ),
        certificate: schema.maybe(schema.string({ maxLength: 100000 })),
        key: schema.maybe(schema.string({ maxLength: 100000 })),
        es_certificate_authorities: schema.maybe(
          schema.arrayOf(schema.string({ maxLength: 100000 }), { maxSize: 10 })
        ),
        es_certificate: schema.maybe(schema.string({ maxLength: 100000 })),
        es_key: schema.maybe(schema.string({ maxLength: 100000 })),
        agent_certificate_authorities: schema.maybe(
          schema.arrayOf(schema.string({ maxLength: 100000 }), { maxSize: 10 })
        ),
        agent_certificate: schema.maybe(schema.string({ maxLength: 100000 })),
        agent_key: schema.maybe(schema.string({ maxLength: 100000 })),
        client_auth: schema.maybe(
          schema.oneOf([
            schema.literal(clientAuth.Optional),
            schema.literal(clientAuth.Required),
            schema.literal(clientAuth.None),
          ])
        ),
      }),
    ])
  ),
});

export const FleetServerHostSchema = FleetServerHostBaseSchema.extends({
  id: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }),
  name: schema.string({ maxLength: 255 }),
  host_urls: schema.arrayOf(schema.string({ maxLength: 2048 }), { minSize: 1, maxSize: 10 }),
  is_default: schema.boolean({ defaultValue: false }),
  is_internal: schema.maybe(schema.boolean()),
  is_preconfigured: schema.boolean({ defaultValue: false }),
  proxy_id: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH })])
  ),
});

export const FleetServerHostResponseSchema = schema.object({
  item: FleetServerHostSchema,
});

export const PostFleetServerHostRequestSchema = {
  body: FleetServerHostSchema.extends({
    id: schema.maybe(schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH })),
  }),
};

export const GetOneFleetServerHostRequestSchema = {
  params: schema.object({
    itemId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the Fleet Server host' },
    }),
  }),
};

export const PutFleetServerHostRequestSchema = {
  params: schema.object({
    itemId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the Fleet Server host' },
    }),
  }),
  body: FleetServerHostBaseSchema,
};

export const GetAllFleetServerHostRequestSchema = {};
