/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentType,
  AgentDefinition,
  builtinToolProviderId,
  allToolsSelectionWildcard as allTools,
} from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ProvidedAgent } from '@kbn/onechat-server';
import type { AgentProviderWithId } from '../types';
import { createHandler } from './handler';
import type { AgentClient } from '../client';

/**
 * Returns an agent provider exposing profile-based agents.
 */
export const creatProfileProvider = ({
  getScopedClient,
}: {
  getScopedClient: (request: KibanaRequest) => Promise<AgentClient>;
}): AgentProviderWithId => {
  const provider: AgentProviderWithId = {
    id: 'profile',
    has: async ({ request, agentId }) => {
      const agentClient = await getScopedClient(request);
      return agentClient.has(agentId);
    },
    get: async ({ request, agentId }) => {
      const agentClient = await getScopedClient(request);
      const agent = await agentClient.get(agentId);
      return profileToDescriptor({ agent });
    },
    list: async ({ request }) => {
      const agentClient = await getScopedClient(request);
      const agentProfiles = await agentClient.list();
      return agentProfiles.map((agent) => profileToDescriptor({ agent }));
    },
  };

  return provider;
};

const profileToDescriptor = ({ agent }: { agent: AgentDefinition }): ProvidedAgent => {
  return {
    type: AgentType.chat,
    id: agent.id,
    description: agent.description,
    handler: createHandler({
      agentId: agent.id,
      toolSelection: [
        ...(agent.configuration.tools ?? [
          { provider: builtinToolProviderId, tool_ids: [allTools] },
        ]),
      ],
      customInstructions: agent.configuration.additional_prompt,
    }),
  };
};
