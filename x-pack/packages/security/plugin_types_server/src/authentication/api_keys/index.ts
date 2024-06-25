/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  UpdateCrossClusterAPIKeyParams,
  UpdateRestAPIKeyParams,
  UpdateRestAPIKeyWithKibanaPrivilegesParams,
} from './api_keys';
export {
  getUpdateRestApiKeyWithKibanaPrivilegesSchema,
  updateRestApiKeySchema,
  updateCrossClusterApiKeySchema,
} from './api_keys';

export {
  restApiKeySchema,
  crossClusterApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
} from '@kbn/core-security-common';

export type {
  CreateAPIKeyParams,
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  ValidateAPIKeyParams,
  CreateRestAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
  CreateCrossClusterAPIKeyParams,
  GrantAPIKeyResult,
} from '@kbn/core-security-common';
