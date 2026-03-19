/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { PluginStartDependencies } from './types';
import { createListRuleTypesTool } from './tools/list_rule_types';
import { createGetRuleTypeParamsSchemaTool } from './tools/get_rule_type_params_schema';
import { createCreateRuleTool } from './tools/create_rule';
import { createGetRuleTool } from './tools/get_rule';

export function registerAlertingTools({
  core,
  agentBuilder,
}: {
  core: CoreSetup<PluginStartDependencies>;
  agentBuilder: AgentBuilderPluginSetup;
}) {
  const tools = [
    createListRuleTypesTool(core),
    createGetRuleTypeParamsSchemaTool(core),
    createCreateRuleTool(core),
    createGetRuleTool(core),
  ];

  for (const tool of tools) {
    agentBuilder.tools.register(tool);
  }
}
