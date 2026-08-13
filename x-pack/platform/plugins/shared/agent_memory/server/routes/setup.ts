/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { AgentMemoryRouteHandlerDeps } from '../types';

/**
 * POST /internal/agent_memory/_setup
 *
 * Idempotent: reconciles index mappings and returns status.
 * Requires `write_agent_memory` privilege (admin / setup callers only).
 */
export const registerSetupRoute = ({ router, getMemoryStorage }: AgentMemoryRouteHandlerDeps) => {
  router.post(
    {
      path: '/internal/agent_memory/_setup',
      options: { access: 'internal', summary: 'Set up Agent Memory index' },
      security: {
        authz: {
          requiredPrivileges: [AGENT_MEMORY_API_PRIVILEGES.write],
        },
      },
      validate: false,
    },
    async (context, _request, response) => {
      const core = await context.core;
      const storage = getMemoryStorage(core.elasticsearch.client.asCurrentUser);
      await storage.getClient().reconcileMappings();
      return response.ok({
        body: { status: 'ready' },
      });
    }
  );
};
