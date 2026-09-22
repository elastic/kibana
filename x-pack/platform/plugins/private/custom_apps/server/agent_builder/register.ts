/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createCreateAppTool, createListAppsTool } from './tools';

export function registerAgentBuilderTools(agentBuilder: AgentBuilderPluginSetup): void {
  agentBuilder.tools.register(createCreateAppTool());
  agentBuilder.tools.register(createListAppsTool());
}
