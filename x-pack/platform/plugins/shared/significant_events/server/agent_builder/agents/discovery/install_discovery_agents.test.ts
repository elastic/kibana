/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
  discoveryAgentType,
} from '.';
import { installDiscoveryAgents } from './install_discovery_agents';

describe('installDiscoveryAgents', () => {
  it('ensures system-owned persisted typed agents in the requested space', async () => {
    const agentBuilder = agentBuilderMocks.createStart();
    const availability = { cacheMode: 'space' as const, handler: jest.fn() };

    await installDiscoveryAgents({ agentBuilder, spaceId: 'space-1', availability });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledTimes(1);
    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      availability,
      agent: {
        id: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID,
        type: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
        name: 'Nightshift Triager',
        description: discoveryAgentType.description,
        labels: ['observability', 'streams', 'significant-events', 'discovery'],
        avatar_symbol: 'NT',
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
