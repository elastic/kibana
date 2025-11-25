/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup } from '@kbn/core/server';
import {
  getDocumentByIdTool,
  executeEsqlTool,
  searchTool,
  generateEsqlTool,
  getIndexMappingsTool,
  listIndicesTool,
  indexExplorerTool,
  createVisualizationTool,
} from './tools';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderPlatformPluginStart,
} from './types';

export const registerTools = ({
  coreSetup,
  setupDeps,
}: {
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  setupDeps: PluginSetupDependencies;
}) => {
  const { onechat } = setupDeps;

  const tools: Array<BuiltinToolDefinition<any>> = [
    searchTool(),
    getDocumentByIdTool(),
    executeEsqlTool(),
    generateEsqlTool(),
    getIndexMappingsTool(),
    listIndicesTool(),
    indexExplorerTool(),
    createVisualizationTool(),
  ];

  tools.forEach((tool) => {
    onechat.tools.register(tool);
  });
};
