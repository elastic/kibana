/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { schema, TypeOf } from '@kbn/config-schema';
import {
  restApiKeySchema,
  crossClusterApiKeySchema,
  elasticsearchRoleSchema,
  getKibanaRoleSchema,
} from '@kbn/core-security-common';

/**
 * Response of Kibana Update API key endpoint.
 */
export type UpdateAPIKeyResult = estypes.SecurityUpdateApiKeyResponse;

/**
 * Request body of Kibana Update API key endpoint.
 */
export type UpdateAPIKeyParams =
  | UpdateRestAPIKeyParams
  | UpdateCrossClusterAPIKeyParams
  | UpdateRestAPIKeyWithKibanaPrivilegesParams;

export const updateRestApiKeySchema = restApiKeySchema.extends({
  name: null,
  id: schema.string(),
});

export const updateCrossClusterApiKeySchema = crossClusterApiKeySchema.extends({
  name: null,
  id: schema.string(),
});

export type UpdateRestAPIKeyParams = TypeOf<typeof updateRestApiKeySchema>;
export type UpdateCrossClusterAPIKeyParams = TypeOf<typeof updateCrossClusterApiKeySchema>;
export type UpdateRestAPIKeyWithKibanaPrivilegesParams = TypeOf<
  ReturnType<typeof getUpdateRestApiKeyWithKibanaPrivilegesSchema>
>;

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
