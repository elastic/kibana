/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { sigEventsRuleOnRulePlannerAgent } from './planner';

export { SIGEVENTS_RULE_ON_RULE_PLANNER_AGENT_ID } from './planner';

export const registerSignificantEventsRuleOnRuleAgents = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  agentBuilder.agents.register(sigEventsRuleOnRulePlannerAgent);
};
