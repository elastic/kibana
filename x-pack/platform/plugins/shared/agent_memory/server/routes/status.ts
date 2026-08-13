/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { AgentMemoryRouteHandlerDeps } from '../types';

/**
 * GET /internal/agent_memory/status
 *
 * Returns whether the agent-memory index exists and is ready.
 * Requires `read_agent_memory` privilege.
 */
export const registerStatusRoute = ({ router, getMemoryStorage }: AgentMemoryRouteHandlerDeps) => {
  router.get(
    {
      path: '/internal/agent_memory/status',
      options: { access: 'internal', summary: 'Get Agent Memory status' },
      security: {
        authz: {
          requiredPrivileges: [AGENT_MEMORY_API_PRIVILEGES.read],
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      const core = await context.core;
      const storage = getMemoryStorage(core.elasticsearch.client.asCurrentUser);
      const exists = await storage.getClient().existsIndex();
      return response.ok({
        body: {
          status: exists ? 'ready' : 'not_installed',
        },
      });
    }
  );
};
