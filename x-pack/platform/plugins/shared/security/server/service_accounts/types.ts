/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CreateServiceAccountParams,
  ExchangeServiceAccountTokenResponse,
  ServiceAccount,
} from '@kbn/core-security-server';

/**
 * A backend capable of managing service accounts for the current runtime.
 *
 * Implemented once for UIAM-backed deployments and once for Elasticsearch-backed
 * ones, so the route and contract layers stay backend-agnostic.
 */
export interface ServiceAccountsBackend {
  create(request: KibanaRequest, params: CreateServiceAccountParams): Promise<ServiceAccount>;

  /**
   * Exchanges a service account ID for an ephemeral access token under Kibana's own system
   * credential. Performs no user authorization: callers must authorize their own users first.
   */
  exchangeToken(serviceAccountId: string): Promise<ExchangeServiceAccountTokenResponse>;
}

/**
 * Start contract of the service accounts service. `null` when the feature is
 * disabled, mirroring how OAuth management is exposed.
 */
export type ServiceAccountsServiceStart = ServiceAccountsBackend;
