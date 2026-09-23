/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  discoveryAgentType,
  registerSignificantEventsDiscoveryAgentTypes,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
} from '.';

describe('discovery agent types', () => {
  it('registers the managed discovery base configuration', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSignificantEventsDiscoveryAgentTypes({ agentBuilder });

    expect(agentBuilder.agents.registerType).toHaveBeenCalledTimes(1);
    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(discoveryAgentType);
    expect(discoveryAgentType).toMatchObject({
      id: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
      baseConfiguration: {
        enable_elastic_capabilities: false,
        connector_ids: [],
        skill_ids: ['significant-events-ki-grounding', 'significant-events-memory'],
      },
    });
  });
});
