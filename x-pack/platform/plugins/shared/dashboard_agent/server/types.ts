/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { SharePluginStart } from '@kbn/share-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface DashboardAgentSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface DashboardAgentStartDependencies {
  dashboard: DashboardPluginStart;
  share: SharePluginStart;
  spaces?: SpacesPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginStart {}
