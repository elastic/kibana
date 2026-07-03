/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { RelayClientImpl } from './relay_client';
export type { RelayClientOptions } from './relay_client';
export type {
  RelayClient,
  RelayClientTlsOptions,
  StartSlackInstallInput,
  StartSlackInstallResult,
  ListPageInput,
  ListTenantsResult,
  ListBindingsResult,
  Tenant,
  Binding,
  BindingScope,
} from './types';
export {
  RelayServiceError,
  RelayUnreachableError,
  RelayResponseError,
  isRelayServiceError,
} from './errors';
export {
  createDeploymentToken,
  STREAMS_SLACK_RELAY_API_KEY_TYPE,
} from './create_deployment_api_key';
