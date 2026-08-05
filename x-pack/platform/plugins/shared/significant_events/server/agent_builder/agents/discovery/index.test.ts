/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  discoveryAgentType,
  judgeAgentType,
  registerSignificantEventsDiscoveryAgentTypes,
  SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
  SIGNIFICANT_EVENTS_JUDGE_AGENT_TYPE_ID,
} from '.';

describe('discovery agent types', () => {
  it('registers the managed discovery and judge base configurations', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSignificantEventsDiscoveryAgentTypes({ agentBuilder });

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(discoveryAgentType);
    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(judgeAgentType);
    expect(discoveryAgentType).toMatchObject({
      id: SIGNIFICANT_EVENTS_DISCOVERY_AGENT_TYPE_ID,
      baseConfiguration: {
        enable_elastic_capabilities: false,
        connector_ids: [],
        skill_ids: ['significant-events-ki-grounding'],
      },
    });
    expect(judgeAgentType).toMatchObject({
      id: SIGNIFICANT_EVENTS_JUDGE_AGENT_TYPE_ID,
      baseConfiguration: {
        enable_elastic_capabilities: false,
        connector_ids: [],
        skill_ids: ['significant-events-ki-grounding'],
      },
    });
  });
});
