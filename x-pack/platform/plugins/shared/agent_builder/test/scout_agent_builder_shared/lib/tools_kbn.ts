/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';

import { AGENT_BUILDER_PUBLIC_API_HEADERS } from './kbn_public_api_headers';

export async function createToolViaKbn(kbnClient: KbnClient, body: unknown): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/agent_builder/tools',
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
    body,
  });
}

export async function deleteAllTools(kbnClient: KbnClient): Promise<void> {
  const res = await kbnClient.request<{ results?: Array<{ id: string; readonly?: boolean }> }>({
    method: 'GET',
    path: '/api/agent_builder/tools',
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
  });
  const tools = res.data.results ?? [];
  await Promise.allSettled(
    tools
      .filter(({ readonly }) => !readonly)
      .map(({ id }) =>
        kbnClient.request({
          method: 'DELETE',
          path: `/api/agent_builder/tools/${encodeURIComponent(id)}`,
          headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
        })
      )
  );
}
