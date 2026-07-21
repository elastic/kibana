/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { LlmProxy } from '@kbn/ftr-llm-proxy';

const XSRF = { 'kbn-xsrf': 'scout-agent-builder-dashboards' };

export async function deleteAllConnectors(kbnClient: KbnClient): Promise<void> {
  const list = await kbnClient.request<
    Array<{ id: string; is_preconfigured?: boolean; is_system_action?: boolean }>
  >({
    method: 'GET',
    path: '/api/actions/connectors',
  });
  const connectors = Array.isArray(list.data) ? list.data : [];
  const deletable = connectors.filter(
    (connector) => !connector.is_preconfigured && !connector.is_system_action
  );
  await Promise.all(
    deletable.map((connector) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/api/actions/connector/${encodeURIComponent(connector.id)}`,
        headers: XSRF,
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
    headers: XSRF,
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
