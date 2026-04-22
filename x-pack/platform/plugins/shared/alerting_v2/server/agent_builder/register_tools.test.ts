/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { registerAlertingV2Tools } from './register_tools';
import {
  ALERTING_V2_GET_RULE_TOOL_ID,
  ALERTING_V2_FIND_RULES_TOOL_ID,
  ALERTING_V2_BULK_GET_RULES_TOOL_ID,
  ALERTING_V2_GET_RULE_TAGS_TOOL_ID,
  ALERTING_V2_CREATE_RULE_TOOL_ID,
  ALERTING_V2_UPDATE_RULE_TOOL_ID,
  ALERTING_V2_DELETE_RULE_TOOL_ID,
  ALERTING_V2_ENABLE_RULE_TOOL_ID,
  ALERTING_V2_DISABLE_RULE_TOOL_ID,
  ALERTING_V2_BULK_DELETE_RULES_TOOL_ID,
  ALERTING_V2_BULK_ENABLE_RULES_TOOL_ID,
  ALERTING_V2_BULK_DISABLE_RULES_TOOL_ID,
} from './tool_ids';

jest.mock('./scoped_rules_client_factory', () => ({
  buildScopedRulesClientFactory: jest.fn().mockReturnValue(jest.fn()),
}));

const ALL_TOOL_IDS = [
  ALERTING_V2_GET_RULE_TOOL_ID,
  ALERTING_V2_FIND_RULES_TOOL_ID,
  ALERTING_V2_BULK_GET_RULES_TOOL_ID,
  ALERTING_V2_GET_RULE_TAGS_TOOL_ID,
  ALERTING_V2_CREATE_RULE_TOOL_ID,
  ALERTING_V2_UPDATE_RULE_TOOL_ID,
  ALERTING_V2_DELETE_RULE_TOOL_ID,
  ALERTING_V2_ENABLE_RULE_TOOL_ID,
  ALERTING_V2_DISABLE_RULE_TOOL_ID,
  ALERTING_V2_BULK_DELETE_RULES_TOOL_ID,
  ALERTING_V2_BULK_ENABLE_RULES_TOOL_ID,
  ALERTING_V2_BULK_DISABLE_RULES_TOOL_ID,
];

describe('registerAlertingV2Tools', () => {
  it('registers all Alerting V2 tools', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    registerAlertingV2Tools({ agentBuilder, getInjection: jest.fn() });

    expect(agentBuilder.tools.register).toHaveBeenCalledTimes(ALL_TOOL_IDS.length);
  });

  it('registers tools with the expected IDs', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    registerAlertingV2Tools({ agentBuilder, getInjection: jest.fn() });

    const registeredIds = agentBuilder.tools.register.mock.calls.map((call) => call[0].id);
    expect(registeredIds).toEqual(expect.arrayContaining(ALL_TOOL_IDS));
  });

  it('registers tools with non-empty descriptions and schemas', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    registerAlertingV2Tools({ agentBuilder, getInjection: jest.fn() });

    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      expect(tool.description).toBeTruthy();
      expect(tool).toHaveProperty('schema');
    }
  });
});
