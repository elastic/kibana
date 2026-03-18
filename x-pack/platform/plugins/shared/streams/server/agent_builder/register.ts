/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { GetScopedClients } from '../routes/types';
import { registerStreamsTools } from './tools/register_tools';
import { streamExplorationSkill } from './skills/stream_exploration_skill';

export const registerStreamsAgentBuilder = ({
  agentBuilder,
  getScopedClients,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
}) => {
  registerStreamsTools({ tools: agentBuilder.tools, getScopedClients });
  agentBuilder.skills.register(streamExplorationSkill);
};
