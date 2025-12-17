/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum McpToolHealthStatus {
  Healthy = 'healthy',
  ToolNotFound = 'tool_not_found',
  ConnectorNotFound = 'connector_not_found',
  ListToolsFailed = 'list_tools_failed',
  ToolUnhealthy = 'tool_unhealthy',
}

export type McpToolUnhealthyStatus = Exclude<McpToolHealthStatus, McpToolHealthStatus.Healthy>;

export const mcpUnhealthyStatusIconMap: Record<McpToolUnhealthyStatus, string> = {
  [McpToolHealthStatus.ToolNotFound]: 'magnifyWithExclamation',
  [McpToolHealthStatus.ConnectorNotFound]: 'unlink',
  [McpToolHealthStatus.ListToolsFailed]: 'unlink',
  [McpToolHealthStatus.ToolUnhealthy]: 'warning',
};

export interface McpConfigurationFieldsProps {
  mcpHealthStatus?: McpToolHealthStatus;
  setMcpHealthStatus: (status: McpToolHealthStatus) => void;
}
