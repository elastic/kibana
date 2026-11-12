/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';

import { AGENT_BUILDER_PUBLIC_API_HEADERS } from './kbn_public_api_headers';

const createdToolIdListeners = new Set<(toolId: string) => void>();

/** Registers a listener for tool ids successfully created through {@link createToolViaKbn}. */
export function subscribeCreatedToolIds(listener: (toolId: string) => void): () => void {
  createdToolIdListeners.add(listener);
  return () => {
    createdToolIdListeners.delete(listener);
  };
}

export async function createToolViaKbn(kbnClient: KbnClient, body: unknown): Promise<void> {
  await kbnClient.request({
    method: 'POST',
    path: '/api/agent_builder/tools',
    headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
    body,
  });
  if (body !== null && typeof body === 'object' && 'id' in body && typeof body.id === 'string') {
    for (const listener of createdToolIdListeners) {
      listener(body.id);
    }
  }
}

/** Deletes only the given tool ids. Missing ids are ignored. */
export async function deleteToolsByIds(
  kbnClient: KbnClient,
  toolIds: readonly string[]
): Promise<void> {
  await Promise.allSettled(
    toolIds.map((toolId) =>
      kbnClient.request({
        method: 'DELETE',
        path: `/api/agent_builder/tools/${encodeURIComponent(toolId)}`,
        headers: { ...AGENT_BUILDER_PUBLIC_API_HEADERS },
        ignoreErrors: [404],
      })
    )
  );
}
