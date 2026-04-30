/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface McpGatewayConnectorConfig {
  connectorId: string;
  /**
   * Slug derived from the connector name at configuration time, used as a stable
   * prefix for proxied tool names (e.g. "my_connector__list_repos").
   */
  connectorSlug: string;
  enabled: boolean;
}

export interface McpGatewayConfig {
  /** Master toggle – when false no tools are proxied regardless of per-connector settings. */
  enabled: boolean;
  connectors: McpGatewayConnectorConfig[];
}
