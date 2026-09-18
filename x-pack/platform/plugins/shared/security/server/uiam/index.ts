/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getUiamAuthorizationHeaderFromRequest,
  getUiamCredentialsFromRequest,
} from './get_uiam_credentials';
export { KIBANA_SOLUTION_TO_UIAM_PROJECT_TYPE } from './project_type';
export { isExternalApiKey } from './is_external_api_key';
export {
  UiamService,
  type UiamServicePublic,
  type ConvertUiamApiKeyRequestEntry,
  type ConvertUiamApiKeysResponse,
  type CreateOAuthClientRequestBody,
  type PatchOAuthClientRequestBody,
  type OAuthClientResponse,
  type OAuthConnectionResponse,
  type OAuthClientsResponse,
  type OAuthConnectionsResponse,
  type OAuthClientLogo,
  type OAuthClientType,
} from './uiam_service';
