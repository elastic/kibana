/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';

const XSFR = { 'kbn-xsrf': 'scout-agent-builder' };

export async function deleteConnectorById(
  kbnClient: KbnClient,
  connectorId: string
): Promise<void> {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${encodeURIComponent(connectorId)}`,
    headers: XSFR,
  });
}

export async function deleteAllConnectors(kbnClient: KbnClient): Promise<void> {
  const list = await kbnClient.request<Array<{ id: string }>>({
    method: 'GET',
    path: '/api/actions/connectors',
  });
  const connectors = Array.isArray(list.data) ? list.data : [];
  await Promise.all(
    connectors.map((connector) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${encodeURIComponent(connector.id)}`,
        headers: XSFR,
      })
    )
  );
}

export async function createGenAiConnectorForProxy(
  kbnClient: KbnClient,
  proxy: LlmProxy
): Promise<{ id: string }> {
  const res = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: XSFR,
    body: {
      name: 'llm-proxy',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
      connector_type_id: '.gen-ai',
    },
  });
  return { id: res.data.id };
}

export async function createMcpConnectorViaKbn(
  kbnClient: KbnClient,
  serverUrl: string,
  options: { name?: string } = {}
): Promise<{ id: string }> {
  const res = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'mcp-test' },
    body: {
      name: options.name ?? 'mcp-test-connector',
      config: {
        serverUrl,
        hasAuth: false,
      },
      secrets: {},
      connector_type_id: '.mcp',
    },
  });
  return { id: res.data.id };
}
