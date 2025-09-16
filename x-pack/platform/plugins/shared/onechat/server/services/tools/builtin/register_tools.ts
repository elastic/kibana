/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { BuiltinToolRegistry } from './builtin_registry';
import {
  executeEsqlTool,
  executeWorkflowTool,
  generateEsqlTool,
  getDocumentByIdTool,
  getIndexMappingsTool,
  getWorkflowDetailsTool,
  getWorkflowResultTool,
  indexExplorerTool,
  listIndicesTool,
  listWorkflowsTool,
  searchTool,
} from './definitions';

export const registerBuiltinTools = ({
  registry,
  workflowsManagement,
}: {
  registry: BuiltinToolRegistry;
  workflowsManagement?: WorkflowsPluginSetup;
}) => {
  const tools: Array<BuiltinToolDefinition<any>> = [
    searchTool(),
    getDocumentByIdTool(),
    executeEsqlTool(),
    generateEsqlTool(),
    getIndexMappingsTool(),
    listIndicesTool(),
    indexExplorerTool(),
  ];

  // Only register workflow tools if workflows management plugin is available
  if (workflowsManagement) {
    tools.push(
      listWorkflowsTool(workflowsManagement),
      getWorkflowDetailsTool(workflowsManagement),
      executeWorkflowTool(workflowsManagement),
      getWorkflowResultTool(workflowsManagement)
    );
  }

  tools.forEach((tool) => {
    registry.register(tool);
  });
};
