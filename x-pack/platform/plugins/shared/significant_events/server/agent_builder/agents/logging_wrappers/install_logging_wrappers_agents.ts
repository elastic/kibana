/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import {
  SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_ID,
  SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
  loggingWrappersAgentType,
} from './logging_wrappers';

/**
 * Installs the system-owned, user-editable logging-wrappers investigator agent
 * profile in the target space. Idempotent — does not overwrite existing agents or
 * later user edits.
 */
export const installLoggingWrappersAgents = async ({
  agentBuilder,
  spaceId,
  availability,
}: {
  agentBuilder: AgentBuilderPluginStart;
  spaceId: string;
  availability?: AgentAvailabilityConfig;
}): Promise<void> => {
  await agentBuilder.agents.ensure({
    spaceId,
    availability,
    agent: {
      id: SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_ID,
      type: SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
      name: 'Logging Wrapper Investigator',
      description: loggingWrappersAgentType.description,
      labels: ['observability', 'streams', 'significant-events', 'code-intelligence'],
      avatar_symbol: 'LW',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
