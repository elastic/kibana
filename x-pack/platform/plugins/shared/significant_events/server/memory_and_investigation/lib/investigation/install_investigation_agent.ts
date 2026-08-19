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
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
} from '../../agents/investigation';

export const installInvestigationAgent = async ({
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
      id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
      type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
      name: 'Nightshift Investigator',
      description:
        'Investigates an observability issue by querying available signals (logs, traces, metrics), ' +
        'reasoning about causality direction, and producing a contributing-factors conclusion with supporting evidence.',
      labels: ['observability', 'streams', 'significant-events', 'investigation', 'root-cause'],
      avatar_symbol: 'NI',
      access_control: { access_mode: AgentAccessControlMode.Public },
      configuration: {
        tools: [],
        skill_ids: [],
        connector_ids: [],
      },
    },
  });
};
