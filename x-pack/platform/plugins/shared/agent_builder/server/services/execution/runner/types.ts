/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Runner, HooksServiceStart } from '@kbn/agent-builder-server';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ToolsServiceStart } from '../../tools';
import type { AgentsServiceStart } from '../../agents';
import type { AttachmentServiceStart } from '../../attachments';
import type { AnalyticsService, TrackingService } from '../../../telemetry';
import type { SkillServiceStart } from '../../skills';
import type { PluginsServiceStart } from '../../plugins/plugin_service';

export interface RunnerFactoryDeps {
  // core services
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  // plugin deps
  inference: InferenceServerStart;
  spaces: SpacesPluginStart | undefined;
  actions: ActionsPluginStart;
  // internal service deps
  toolsService: ToolsServiceStart;
  agentsService: AgentsServiceStart;
  attachmentsService: AttachmentServiceStart;
  skillServiceStart: SkillServiceStart;
  pluginsServiceStart: PluginsServiceStart;
  trackingService?: TrackingService;
  analyticsService?: AnalyticsService;
  hooks: HooksServiceStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  /** Lazy getter for the execution service (breaks circular dep with runner). */
  getExecutionService: () => AgentExecutionService;
}

export interface RunnerFactory {
  getRunner(): Runner;
}
