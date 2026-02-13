/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { AuthenticationServiceStart } from './authentication_service';
export type { ClientAuthentication } from './client_authentication';

export type {
  NativeAPIKeysType,
  UpdateAPIKeyParams,
  UpdateAPIKeyResult,
  UpdateCrossClusterAPIKeyParams,
  UpdateRestAPIKeyParams,
  UpdateRestAPIKeyWithKibanaPrivilegesParams,
  GrantUiamAPIKeyParams,
  InvalidateUiamAPIKeyParams,
  UiamAPIKeysType,
} from '@kbn/core-security-server';

export {
  crossClusterApiKeySchema,
  getRestApiKeyWithKibanaPrivilegesSchema,
  getUpdateRestApiKeyWithKibanaPrivilegesSchema,
  restApiKeySchema,
  updateRestApiKeySchema,
  updateCrossClusterApiKeySchema,
} from './api_keys';
