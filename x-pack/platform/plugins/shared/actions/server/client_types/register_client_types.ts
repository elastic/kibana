/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { McpClient } from '@kbn/mcp-client';
import type { GetAxiosInstanceWithAuthFn } from '../lib/get_axios_instance';
import type { CreateMcpClientFn } from '../lib/get_mcp_client';
import type { ClientTypeRegistry, RegisteredClientType } from './client_type_registry';

interface McpClientTypeConfig {
  urlField: string;
}

const httpClientType = (
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn
): RegisteredClientType<AxiosInstance> => ({
  id: 'http',
  supportedAuthTypes: '*',
  create: async (opts) =>
    getAxiosInstanceWithAuth({
      connectorId: opts.connectorId,
      secrets: opts.secrets,
      connectorTokenClient: opts.connectorTokenClient,
      additionalHeaders: opts.additionalHeaders,
      signal: opts.signal,
      authMode: opts.authMode,
      profileUid: opts.profileUid,
    }),
});

const mcpClientType = (
  createMcpClient: CreateMcpClientFn
): RegisteredClientType<McpClient, McpClientTypeConfig> => ({
  id: 'mcp',
  supportedAuthTypes: [
    'bearer',
    'basic',
    'api_key_header',
    'none',
    'oauth_client_credentials',
    'oauth_authorization_code',
  ],
  create: async (opts) => {
    const url = opts.config[opts.clientConfig.urlField] as string | undefined;
    if (!url) {
      throw new Error(
        `MCP client requires a URL in config field "${opts.clientConfig.urlField}" but none was provided.`
      );
    }
    return createMcpClient({
      connectorId: opts.connectorId,
      url,
      secrets: opts.secrets,
      additionalHeaders: opts.additionalHeaders,
      connectorTokenClient: opts.connectorTokenClient,
      authMode: opts.authMode,
      profileUid: opts.profileUid,
    });
  },
  connect: async (client) => {
    await client.connect();
  },
  disconnect: async (client) => {
    await client.disconnect();
  },
  isConnected: (client) => client.isConnected(),
});

export const registerClientTypes = ({
  registry,
  getAxiosInstanceWithAuth,
  createMcpClient,
}: {
  registry: ClientTypeRegistry;
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
  createMcpClient: CreateMcpClientFn;
}) => {
  registry.register(httpClientType(getAxiosInstanceWithAuth));
  registry.register(mcpClientType(createMcpClient));
};
