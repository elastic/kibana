/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { KibanaRequest } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { getKibanaRoleSchema, elasticsearchRoleSchema } from '../../authorization';

export interface APIKeys {
  /**
   * Determines if API Keys are enabled in Elasticsearch.
   */
  areAPIKeysEnabled(): Promise<boolean>;

  /**
   * Determines if Cross-Cluster API Keys are enabled in Elasticsearch.
   */
  areCrossClusterAPIKeysEnabled(): Promise<boolean>;

  /**
   * Tries to create an API key for the current user.
   *
   * Returns newly created API key or `null` if API keys are disabled.
   *
   * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for Cross-Cluster API keys.
   *
   * @param request Request instance.
   * @param createParams The params to create an API key
   */
  create(
    request: KibanaRequest,
    createParams: CreateAPIKeyParams
  ): Promise<CreateAPIKeyResult | null>;

  /**
   * Tries to grant an API key for the current user.
   * @param request Request instance.
   * @param createParams Create operation parameters.
   */
  grantAsInternalUser(
    request: KibanaRequest,
    createParams: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams
  ): Promise<GrantAPIKeyResult | null>;

  /**
   * Tries to validate an API key.
   * @param apiKeyPrams ValidateAPIKeyParams.
   */
  validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean>;

  /**
   * Tries to invalidate an API keys.
   * @param request Request instance.
   * @param params The params to invalidate an API keys.
   */
  invalidate(
    request: KibanaRequest,
    params: InvalidateAPIKeysParams
  ): Promise<InvalidateAPIKeyResult | null>;

  /**
   * Tries to invalidate the API keys by using the internal user.
   * @param params The params to invalidate the API keys.
   */
  invalidateAsInternalUser(params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
}

export type CreateAPIKeyParams =
  | CreateRestAPIKeyParams
  | CreateRestAPIKeyWithKibanaPrivilegesParams
  | CreateCrossClusterAPIKeyParams;

/**
 * Response of Kibana Create API key endpoint.
 */
export type CreateAPIKeyResult = estypes.SecurityCreateApiKeyResponse;

export type CreateRestAPIKeyParams = TypeOf<typeof restApiKeySchema>;
export type CreateRestAPIKeyWithKibanaPrivilegesParams = TypeOf<
  ReturnType<typeof getRestApiKeyWithKibanaPrivilegesSchema>
>;
export type CreateCrossClusterAPIKeyParams = TypeOf<typeof crossClusterApiKeySchema>;

export interface GrantAPIKeyResult {
  /**
   * Unique id for this API key
   */
  id: string;
  /**
   * Name for this API key
   */
  name: string;
  /**
   * Generated API key
   */
  api_key: string;
}

/**
 * Represents the parameters for validating API Key credentials.
 */
export interface ValidateAPIKeyParams {
  /**
   * Unique id for this API key
   */
  id: string;

  /**
   * Generated API Key (secret)
   */
  api_key: string;
}

/**
 * Represents the params for invalidating multiple API keys
 */
export interface InvalidateAPIKeysParams {
  ids: string[];
}

/**
 * The return value when invalidating an API key in Elasticsearch.
 */
export interface InvalidateAPIKeyResult {
  /**
   * The IDs of the API keys that were invalidated as part of the request.
   */
  invalidated_api_keys: string[];
  /**
   * The IDs of the API keys that were already invalidated.
   */
  previously_invalidated_api_keys: string[];
  /**
   * The number of errors that were encountered when invalidating the API keys.
   */
  error_count: number;
  /**
   * Details about these errors. This field is not present in the response when error_count is 0.
   */
  error_details?: Array<{
    type?: string;
    reason?: string;
    caused_by?: {
      type?: string;
      reason?: string;
    };
  }>;
}

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
