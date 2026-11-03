/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolsRequest } from '@kbn/agent-builder-common';

/**
 * The `browser_tools` part of a converse request: sent whenever the surface can execute any
 * browser tool (registered or legacy), so the server can route the calls back to this client.
 */
export const buildBrowserToolsRequest = ({
  clientId,
  browserToolIds,
  browserApiTools,
}: {
  clientId: string;
  browserToolIds?: string[];
  browserApiTools?: unknown[];
}): BrowserToolsRequest | undefined => {
  if (!browserToolIds?.length && !browserApiTools?.length) {
    return undefined;
  }
  return { client_id: clientId, tool_ids: browserToolIds ?? [] };
};
