/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { elasticsearchRoleSchema, getKibanaRoleSchema } from '../../authorization';

/** Elasticsearch itself rejects API key names longer than 256 characters. */
const MAX_API_KEY_NAME_LENGTH = 256;
/** Elasticsearch mints API key IDs as 20-character base64 UUIDs; 256 leaves ample headroom. */
const MAX_API_KEY_ID_LENGTH = 256;
/** An Elasticsearch time value, e.g. `30d` or `1000ms`. */
const MAX_EXPIRATION_LENGTH = 64;
/** Matches the Elasticsearch role name ceiling. */
const MAX_ROLE_DESCRIPTOR_NAME_LENGTH = 1024;
/** Index names are capped at 255 bytes; leaves room for long `/regex/` patterns over them. */
const MAX_INDEX_NAME_EXPRESSION_LENGTH = 4096;

export const restApiKeySchema = schema.object({
  type: schema.maybe(schema.literal('rest')),
  name: schema.string({ maxLength: MAX_API_KEY_NAME_LENGTH }),
  expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
  role_descriptors: schema.recordOf(
    schema.string({ maxLength: MAX_ROLE_DESCRIPTOR_NAME_LENGTH }),
    schema.object({}, { unknowns: 'allow' }),
    {
      defaultValue: {},
    }
  ),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const getRestApiKeyWithKibanaPrivilegesSchema = (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) =>
  schema.object({
    type: schema.maybe(schema.literal('rest')),
    name: schema.string({ maxLength: MAX_API_KEY_NAME_LENGTH }),
    expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
    metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    kibana_role_descriptors: schema.recordOf(
      schema.string({ maxLength: MAX_ROLE_DESCRIPTOR_NAME_LENGTH }),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
  });

export const crossClusterApiKeySchema = schema.object({
  type: schema.literal('cross_cluster'),
  name: schema.string({ maxLength: MAX_API_KEY_NAME_LENGTH }),
  expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  access: schema.object(
    {
      search: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string({ maxLength: MAX_INDEX_NAME_EXPRESSION_LENGTH }), {
              maxSize: 100,
            }),
            query: schema.maybe(schema.any()),
            field_security: schema.maybe(schema.any()),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
      replication: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string({ maxLength: MAX_INDEX_NAME_EXPRESSION_LENGTH }), {
              maxSize: 100,
            }),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

export const updateRestApiKeySchema = schema.object({
  id: schema.string({ maxLength: MAX_API_KEY_ID_LENGTH }),
  type: schema.maybe(schema.literal('rest')),
  expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
  role_descriptors: schema.recordOf(
    schema.string({ maxLength: MAX_ROLE_DESCRIPTOR_NAME_LENGTH }),
    schema.object({}, { unknowns: 'allow' }),
    {
      defaultValue: {},
    }
  ),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const updateCrossClusterApiKeySchema = schema.object({
  id: schema.string({ maxLength: MAX_API_KEY_ID_LENGTH }),
  type: schema.literal('cross_cluster'),
  expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  access: schema.object(
    {
      search: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string({ maxLength: MAX_INDEX_NAME_EXPRESSION_LENGTH }), {
              maxSize: 100,
            }),
            query: schema.maybe(schema.any()),
            field_security: schema.maybe(schema.any()),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
      replication: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string({ maxLength: MAX_INDEX_NAME_EXPRESSION_LENGTH }), {
              maxSize: 100,
            }),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

export const getUpdateRestApiKeyWithKibanaPrivilegesSchema = (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) =>
  schema.object({
    type: schema.maybe(schema.literal('rest')),
    expiration: schema.maybe(schema.string({ maxLength: MAX_EXPIRATION_LENGTH })),
    metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    id: schema.string({ maxLength: MAX_API_KEY_ID_LENGTH }),
    kibana_role_descriptors: schema.recordOf(
      schema.string({ maxLength: MAX_ROLE_DESCRIPTOR_NAME_LENGTH }),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
  });
