/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentType,
  toStructuredAgentIdentifier,
  AgentProfile,
  oneChatAgentProviderIds,
  builtinToolProviderId,
  allToolsSelectionWildcard as allTools,
} from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationalAgentDefinition } from '@kbn/onechat-server';
import type { AgentProviderWithId } from '../types';
import { createHandler } from './handler';
import type { AgentProfileClient } from '../profiles/client';

/**
 * Returns an agent provider exposing profile-based agents.
 */
export const creatProfileProvider = ({
  getProfileClient,
}: {
  getProfileClient: (request: KibanaRequest) => Promise<AgentProfileClient>;
}): AgentProviderWithId => {
  const provider: AgentProviderWithId = {
    id: oneChatAgentProviderIds.profile,
    has: async (options) => {
      const profileClient = await getProfileClient(options.request);
      const { agentId } = toStructuredAgentIdentifier(options.agentId);
      return profileClient.has(agentId);
    },
    get: async (options) => {
      const profileClient = await getProfileClient(options.request);
      const { agentId } = toStructuredAgentIdentifier(options.agentId);
      const profile = await profileClient.get(agentId);
      return profileToDescriptor({ profile });
    },
    list: async (options) => {
      const profileClient = await getProfileClient(options.request);
      const agentProfiles = await profileClient.list();
      return agentProfiles.map((profile) => profileToDescriptor({ profile }));
    },
  };

  return provider;
};

const profileToDescriptor = ({
  profile,
}: {
  profile: AgentProfile;
}): ConversationalAgentDefinition => {
  return {
    type: AgentType.conversational,
    id: profile.id,
    description: profile.description,
    handler: createHandler({
      agentId: profile.id,
      toolSelection: [
        ...(profile.toolSelection ?? []),
        // built-in tools are included by default
        { provider: builtinToolProviderId, toolIds: [allTools] },
      ],
      customInstructions: profile.customInstructions,
    }),
  };
};
