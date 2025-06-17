/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MCP_CONNECTOR_AUTH_TYPE_BASIC = 'basic';
export const MCP_CONNECTOR_AUTH_TYPE_API_KEY = 'apiKey';
export const MCP_CONNECTOR_AUTH_TYPE_NONE = 'none';

export type MCPConnectorAuthTypeNone = typeof MCP_CONNECTOR_AUTH_TYPE_NONE;
export type MCPConnectorAuthTypeBasic = typeof MCP_CONNECTOR_AUTH_TYPE_BASIC;
export type MCPConnectorAuthTypeApiKey = typeof MCP_CONNECTOR_AUTH_TYPE_API_KEY;

export interface MCPConnectorHTTPServiceConfig {
  http: {
    url: string;
  };
  authType: MCPConnectorAuthType;
}

export type MCPConnectorAuthType =
  | MCPConnectorAuthTypeBasic
  | MCPConnectorAuthTypeApiKey
  | MCPConnectorAuthTypeNone;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MCPConnectorConfig = {
  version?: string;
  service: MCPConnectorHTTPServiceConfig;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MCPConnectorSecretsNoAuth = {};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MCPConnectorSecretsBasicAuth = {
  auth: {
    username: string;
    password: string;
  };
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MCPConnectorSecretsAPIKey = {
  auth: {
    apiKey: string;
  };
};

export type MCPConnectorSecrets =
  | MCPConnectorSecretsBasicAuth
  | MCPConnectorSecretsAPIKey
  | MCPConnectorSecretsNoAuth;

export const MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS = 'listTools';
export const MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL = 'callTool';

export type MCPConnectorSubActionType =
  | typeof MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS
  | typeof MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL;

export interface MCPListToolsParams {
  subAction: typeof MCP_CONNECTOR_SUB_ACTION_TYPE_LIST_TOOLS;
  subActionParams: {};
}

export interface MCPCallToolParams {
  subAction: typeof MCP_CONNECTOR_SUB_ACTION_TYPE_CALL_TOOL;
  subActionParams: {
    name: string;
    arguments?: Record<string, any>;
  };
}

export type MCPExecutorParams = MCPListToolsParams | MCPCallToolParams;
