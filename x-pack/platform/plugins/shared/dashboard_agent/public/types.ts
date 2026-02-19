/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicSetupDependencies {}

export interface DashboardAgentPluginPublicStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  share?: SharePluginStart;
}
