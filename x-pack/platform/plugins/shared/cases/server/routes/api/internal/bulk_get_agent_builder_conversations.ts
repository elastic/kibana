/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL } from '../../../../common/constants';
import type { agentBuilderApiV1 } from '../../../../common/types/api';
import { BulkGetConversationsRequestRt } from '../../../../common/types/api/agent_builder/v1';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

interface BulkGetAgentBuilderConversationsRouteDeps {
  getAgentBuilder: () => Promise<AgentBuilderPluginStart>;
}

/**
 * Resolves which of the given conversations the requester can open. Agent Builder's
 * scoped client filters by its own access control, so anything missing from the
 * response is either gone or not readable by this user.
 */
export const createBulkGetAgentBuilderConversationsRoute = ({
  getAgentBuilder,
}: BulkGetAgentBuilderConversationsRouteDeps) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL,
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: {
      body: escapeHatch,
    },
    routerOptions: {
      access: 'internal',
    },
    handler: async ({ request, response }) => {
      try {
        const { ids } = decodeWithExcessOrThrow(BulkGetConversationsRequestRt)(request.body);
        const { conversations } = await getAgentBuilder();
        const client = await conversations.getScopedClient({ request });
        const found = await client.bulkGet(ids);

        const res: agentBuilderApiV1.BulkGetConversationsResponse = {
          conversations: Array.from(found.values(), ({ id, title, agent_id: agentId }) => ({
            id,
            title,
            agent_id: agentId,
          })),
        };

        return response.ok({ body: res });
      } catch (error) {
        throw createCaseError({
          message: `Failed to bulk get agent builder conversations in route: ${error}`,
          error,
        });
      }
    },
  });
