/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  alerting: AlertingServerStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertingAgentBuilderPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlertingAgentBuilderPluginStart {}
