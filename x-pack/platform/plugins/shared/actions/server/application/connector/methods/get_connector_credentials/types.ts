/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GetConnectorCredentialsOptions {
  id: string;
  minimumValiditySeconds?: number;
  forceRefresh?: boolean;
}

export interface ResolvedConnectorCredentials {
  connectorId: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  headers: Record<string, string>;
  expiresAt?: string;
  expiresInSeconds?: number;
}
