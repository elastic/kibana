/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerLoggingWrappersAgentType } from './logging_wrappers';

export {
  SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_ID,
  SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
  loggingWrappersAgentType,
  registerLoggingWrappersAgentType,
} from './logging_wrappers';
export { installLoggingWrappersAgents } from './install_logging_wrappers_agents';

export const registerSignificantEventsLoggingWrappersAgentTypes = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  registerLoggingWrappersAgentType(agentBuilder);
};
