/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import {
  loggingWrappersAgentType,
  registerSignificantEventsLoggingWrappersAgentTypes,
  SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
} from '.';
import { SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID } from '../../tools/validate_logging_queries/tool';

describe('logging wrappers agent types', () => {
  it('registers the managed logging-wrappers base configuration', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSignificantEventsLoggingWrappersAgentTypes({ agentBuilder });

    expect(agentBuilder.agents.registerType).toHaveBeenCalledTimes(1);
    expect(agentBuilder.agents.registerType).toHaveBeenCalledWith(loggingWrappersAgentType);
    expect(loggingWrappersAgentType).toMatchObject({
      id: SIGNIFICANT_EVENTS_LOGGING_WRAPPERS_AGENT_TYPE_ID,
      baseConfiguration: {
        enable_elastic_capabilities: false,
        connector_ids: [],
        skill_ids: [],
      },
    });
  });

  it('grants only the read-only Sourcerer code tools plus validate_logging_queries', () => {
    const agentBuilder = agentBuilderMocks.createSetup();

    registerSignificantEventsLoggingWrappersAgentTypes({ agentBuilder });

    const tools = loggingWrappersAgentType.baseConfiguration.tools;
    expect(tools).toHaveLength(1);
    expect(tools[0].tool_ids).toEqual([
      'git-grep',
      'git-show',
      'git-ls-tree',
      SIGNIFICANT_EVENTS_LOGGING_QUERIES_VALIDATE_TOOL_ID,
    ]);
  });
});
