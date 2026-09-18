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
} from '../agents/investigation';
import {
  installDeductiveInvestigationAgent,
  installInvestigationAgent,
} from './install_investigation_agent';

describe('installInvestigationAgent', () => {
  it('ensures a system-owned persisted typed agent in the requested space', async () => {
    const agentBuilder = agentBuilderMocks.createStart();
    const availability = { cacheMode: 'space' as const, handler: jest.fn() };

    await installInvestigationAgent({ agentBuilder, spaceId: 'space-1', availability });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith({
      spaceId: 'space-1',
      availability,
      agent: {
        id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_ID,
        type: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
        name: 'Nightshift Investigator',
        description: expect.any(String),
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
  });

  it('ensures the deductive investigator so Cortex/Memory hydrate is attached in the UI', async () => {
    const agentBuilder = agentBuilderMocks.createStart();

    await installDeductiveInvestigationAgent({ agentBuilder, spaceId: 'default' });

    expect(agentBuilder.agents.ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'default',
        agent: expect.objectContaining({
          id: 'significant-events.deductive-investigation',
          type: 'platform.sig_events.deductive-investigation-type',
          name: 'Nightshift Deductive Investigator',
          avatar_symbol: 'ND',
        }),
      })
    );
  });
});
