/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GetSandboxCredentialsOptions {
  id: string;
}

export interface ResolvedSandboxCredentials {
  connectorId: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  headers: Record<string, string>;
  /** Hosts the headers may be sent to; never empty. */
  hosts: string[];
}
