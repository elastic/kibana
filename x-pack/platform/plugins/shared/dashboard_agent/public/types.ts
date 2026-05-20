/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DashboardAgentPluginPublicSetupDependencies {}

export interface DashboardAgentPluginPublicStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  data: DataPublicPluginStart;
  dashboard: DashboardStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
