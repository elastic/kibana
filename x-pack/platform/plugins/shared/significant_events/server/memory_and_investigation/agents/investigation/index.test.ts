/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  investigationAgentType,
  registerInvestigationAgentType,
  SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
} from '.';

describe('investigation agent type', () => {
  it('registers the managed investigation base configuration', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerInvestigationAgentType(agentBuilder);

    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(investigationAgentType);
    expect(investigationAgentType).toMatchObject({
      id: SIGNIFICANT_EVENTS_INVESTIGATION_AGENT_TYPE_ID,
      baseConfiguration: {
        enable_elastic_capabilities: true,
        connector_ids: [],
        skill_ids: ['significant-events-memory', 'observability.investigation'],
      },
    });
  });
});
