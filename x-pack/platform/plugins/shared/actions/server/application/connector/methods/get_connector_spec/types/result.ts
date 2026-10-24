/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope, ConnectorMetadata } from '@kbn/connector-specs';

export interface GetConnectorSpecActionResult {
  name: string;
  description?: string;
  isTool: boolean;
  scope: ActionScope;
  inputSchema: Record<string, unknown>;
}

export interface GetConnectorSpecResult {
  metadata: ConnectorMetadata;
  schema: Record<string, unknown>;
  isTestable: boolean;
  authTypeIds: string[];
  hasInboundEvents: boolean;
  isInboundOnly: boolean;
  isEarsExperimental: boolean;
  actions: GetConnectorSpecActionResult[];
  /** Bundled agent skill text for server callers. Never sent over HTTP. */
  skill?: string;
}
