/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getKibanaRoleSchema, elasticsearchRoleSchema } from '../../authorization';

export const restApiKeySchema = schema.object({
  type: schema.maybe(schema.literal('rest')),
  name: schema.string(),
  expiration: schema.maybe(schema.string()),
  role_descriptors: schema.recordOf(schema.string(), schema.object({}, { unknowns: 'allow' }), {
    defaultValue: {},
  }),
  metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const getRestApiKeyWithKibanaPrivilegesSchema = (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) =>
  restApiKeySchema.extends({
    role_descriptors: null,
    kibana_role_descriptors: schema.recordOf(
      schema.string(),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
  });

export const crossClusterApiKeySchema = restApiKeySchema.extends({
  type: schema.literal('cross_cluster'),
  role_descriptors: null,
  access: schema.object(
    {
      search: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string()),
            query: schema.maybe(schema.any()),
            field_security: schema.maybe(schema.any()),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
      replication: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string()),
          })
        )
      ),
    },
    { unknowns: 'allow' }
  ),
});

export const updateRestApiKeySchema = restApiKeySchema.extends({
  name: null,
  id: schema.string(),
});

export const updateCrossClusterApiKeySchema = crossClusterApiKeySchema.extends({
  name: null,
  id: schema.string(),
});

export const getUpdateRestApiKeyWithKibanaPrivilegesSchema = (
  getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]
) =>
  restApiKeySchema.extends({
    role_descriptors: null,
    name: null,
    id: schema.string(),
    kibana_role_descriptors: schema.recordOf(
      schema.string(),
      schema.object({
        elasticsearch: elasticsearchRoleSchema.extends({}, { unknowns: 'allow' }),
        kibana: getKibanaRoleSchema(getBasePrivilegeNames),
      })
    ),
  });
