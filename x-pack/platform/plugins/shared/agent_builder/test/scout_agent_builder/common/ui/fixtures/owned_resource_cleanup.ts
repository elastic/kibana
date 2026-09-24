/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ScoutPage } from '@kbn/scout';
import { deleteConversationsByIds } from '../../../../scout_agent_builder_shared/lib/conversations_es';
import {
  deleteToolsByIds,
  subscribeCreatedToolIds,
} from '../../../../scout_agent_builder_shared/lib/tools_kbn';

const CONVERSATIONS_PATH = '/api/agent_builder/conversations';
const TOOLS_PATH = '/api/agent_builder/tools';
const BULK_CREATE_MCP_TOOLS_PATH = '/internal/agent_builder/tools/_bulk_create_mcp';

function pathnameOf(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

function idFromRecord(value: unknown): string | undefined {
  if (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string'
  ) {
    return value.id;
  }
  return undefined;
}

function toolIdsFromBulkCreate(value: unknown): string[] {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('results' in value) ||
    !Array.isArray(value.results)
  ) {
    return [];
  }
  return value.results.flatMap((result) => {
    if (
      result !== null &&
      typeof result === 'object' &&
      'toolId' in result &&
      typeof result.toolId === 'string'
    ) {
      return [result.toolId];
    }
    return [];
  });
}

/**
 * Deletes conversations and tools created while `use` runs.
 * Browser creates are taken from the page; `createToolViaKbn` ids are subscribed separately.
 */
export async function withOwnedResourceCleanup(
  page: ScoutPage,
  kbnClient: KbnClient,
  use: () => Promise<void>
): Promise<void> {
  const conversationIds = new Set<string>();
  const toolIds = new Set<string>();
  const pending: Array<Promise<void>> = [];
  const unsubscribe = subscribeCreatedToolIds((toolId) => {
    toolIds.add(toolId);
  });

  const onRequest = (request: {
    method: () => string;
    url: () => string;
    postDataJSON: () => unknown;
  }) => {
    if (request.method() !== 'POST') {
      return;
    }
    const pathname = pathnameOf(request.url());
    if (pathname === undefined || !pathname.endsWith(TOOLS_PATH)) {
      return;
    }
    try {
      const toolId = idFromRecord(request.postDataJSON());
      if (toolId) {
        toolIds.add(toolId);
      }
    } catch {
      // Request has no JSON body.
    }
  };

  const onResponse = (response: {
    ok: () => boolean;
    url: () => string;
    request: () => { method: () => string };
    json: () => Promise<unknown>;
  }) => {
    if (!response.ok() || response.request().method() !== 'POST') {
      return;
    }
    const pathname = pathnameOf(response.url());
    if (pathname === undefined) {
      return;
    }
    if (pathname.endsWith(CONVERSATIONS_PATH)) {
      pending.push(
        response
          .json()
          .then((body) => {
            const conversationId = idFromRecord(body);
            if (conversationId) {
              conversationIds.add(conversationId);
            }
          })
          .catch(() => undefined)
      );
      return;
    }
    if (pathname.endsWith(BULK_CREATE_MCP_TOOLS_PATH)) {
      pending.push(
        response
          .json()
          .then((body) => {
            for (const toolId of toolIdsFromBulkCreate(body)) {
              toolIds.add(toolId);
            }
          })
          .catch(() => undefined)
      );
    }
  };

  // Listeners only read method, url, and body. ScoutPage's Playwright overloads
  // expect its own request/response types, which tests are not allowed to import.
  page.on('request', onRequest as never);
  page.on('response', onResponse as never);
  try {
    await use();
  } finally {
    page.off('request', onRequest as never);
    page.off('response', onResponse as never);
    unsubscribe();
    await Promise.all(pending);
    await deleteConversationsByIds(kbnClient, [...conversationIds]);
    await deleteToolsByIds(kbnClient, [...toolIds]);
  }
}
