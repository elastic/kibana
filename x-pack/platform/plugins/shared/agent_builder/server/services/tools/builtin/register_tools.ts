/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
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
} from './definitions';
import type {
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
  AgentBuilderPluginStart,
} from '../../../types';
import type { ToolsServiceSetup } from '../types';

export const registerBuiltinTools = ({
  registry,
  coreSetup,
  setupDeps,
}: {
  registry: ToolsServiceSetup;
  coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
  setupDeps: AgentBuilderSetupDependencies;
}) => {
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
    registry.register(tool);
  });
};
