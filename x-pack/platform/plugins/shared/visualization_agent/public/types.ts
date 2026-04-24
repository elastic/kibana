/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationAgentPluginPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationAgentPluginPublicStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationAgentPluginPublicSetupDependencies {}

export interface VisualizationAgentPluginPublicStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  uiActions: UiActionsStart;
}
