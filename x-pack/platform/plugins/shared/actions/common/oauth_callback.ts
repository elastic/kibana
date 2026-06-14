/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum OAuthAuthorizationStatus {
  Success = 'success',
  Error = 'error',
}

export const OAUTH_CALLBACK_QUERY_PARAMS = {
  CONNECTOR_ID: 'connector_id',
  AUTHORIZATION_STATUS: 'oauth_authorization',
  ERROR: 'error',
  STATUS_CODE: 'status_code',
  AUTO_CLOSE: 'auto_close',
} as const;

export const OAUTH_BROADCAST_CHANNEL_NAME = 'oauth_flow_completed';
