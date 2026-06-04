/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { sigEventsInvestigatorAgent } from './investigator';
import { sigEventsJudgeAgent } from './judge';

export { SIGEVENTS_INVESTIGATOR_AGENT_ID } from './investigator';
export { SIGEVENTS_JUDGE_AGENT_ID } from './judge';

export const registerSignificantEventsDiscoveryAgents = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.agents.register(sigEventsInvestigatorAgent);
  agentBuilder.agents.register(sigEventsJudgeAgent);
};
