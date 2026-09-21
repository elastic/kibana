/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  CONTEXT_ENGINE_SETUP_AGENT_ID,
  CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID,
  contextEngineSetupAgentType,
} from './context_engine_agent';

export const installContextEngineAgent = async ({
  agentBuilder,
  spaceId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    agent: {
      id: CONTEXT_ENGINE_SETUP_AGENT_ID,
      type: CONTEXT_ENGINE_SETUP_AGENT_TYPE_ID,
      name: contextEngineSetupAgentType.name,
      description: contextEngineSetupAgentType.description,
      labels: ['context-engine', 'setup', 'automation'],
      avatar_icon: contextEngineSetupAgentType.avatar_icon,
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
