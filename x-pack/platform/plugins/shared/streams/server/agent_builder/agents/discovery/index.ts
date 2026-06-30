/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { StreamsServer } from '../../../types';
import { createSigEventsAnalystAgent as createSignificantEventsAnalystAgent } from './analyst';
import { createSigEventsJudgeAgent as createSignificantEventsJudgeAgent } from './judge';

export { SIGEVENTS_ANALYST_AGENT_ID } from './analyst';
export { SIGEVENTS_JUDGE_AGENT_ID } from './judge';

export const registerSignificantEventsDiscoveryAgents = ({
  agentBuilder,
  server,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  server: StreamsServer;
}): void => {
  agentBuilder.agents.register(createSignificantEventsAnalystAgent({ server }));
  agentBuilder.agents.register(createSignificantEventsJudgeAgent({ server }));
};
