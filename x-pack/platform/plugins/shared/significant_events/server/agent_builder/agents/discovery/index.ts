/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { createSignificantEventsDiscoveryAgent } from './discovery';
import { createSignificantEventsJudgeAgent } from './judge';

export { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from './discovery';
export { SIGNIFICANT_EVENTS_JUDGE_AGENT_ID } from './judge';

export const registerSignificantEventsDiscoveryAgents = ({
  agentBuilder,
  server,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  server: StreamsServer;
}): void => {
  agentBuilder.agents.register(createSignificantEventsDiscoveryAgent({ server }));
  agentBuilder.agents.register(createSignificantEventsJudgeAgent({ server }));
};
