/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  DataCatalogPluginSetup,
  DataCatalogPluginStart,
} from '@kbn/data-catalog-plugin/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginStart,
} from '@kbn/workflows-management-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface DataSourcesServerSetup {}

export interface DataSourcesServerStart {}

export interface DataSourcesServerSetupDependencies {
  actions: ActionsPluginSetup;
  dataCatalog: DataCatalogPluginSetup;
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface DataSourcesServerStartDependencies {
  actions: ActionsPluginStart;
  dataCatalog: DataCatalogPluginStart;
  agentBuilder: AgentBuilderPluginStart;
  workflowsManagement: WorkflowsServerPluginStart;
}
