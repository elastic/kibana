/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentBuilderSmlPluginSetup } from '@kbn/agent-builder-sml-plugin/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';

export interface AgentBuilderDashboardsSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentBuilderSml: AgentBuilderSmlPluginSetup;
}

export interface AgentBuilderDashboardsStartDependencies {
  dashboard: DashboardPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderDashboardsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderDashboardsPluginStart {}
