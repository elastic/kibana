/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
} from '../../agents/investigation';
import { installInvestigationAgent } from './install_investigation_agent';

describe('installInvestigationAgent', () => {
  it('ensures a system-owned persisted typed agent in the requested space', async () => {
    const agentBuilder = agentBuilderMocks.createStart();

    await installInvestigationAgent({ agentBuilder, spaceId: 'space-1' });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      agent: {
        id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
        type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
        name: 'Streams Investigator',
        description: expect.any(String),
        labels: ['observability', 'streams', 'significant-events', 'investigation', 'root-cause'],
        avatar_symbol: 'SI',
        access_control: { access_mode: AgentAccessControlMode.Public },
        configuration: {
          tools: [],
          skill_ids: [],
          connector_ids: [],
        },
      },
    });
  });
});
