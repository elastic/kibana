/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from './definition';
import { internalNamespaces } from '../base/namespaces';

const platformCoreTool = <TName extends string>(
  toolName: TName
): `${typeof internalNamespaces.platformCore}.${TName}` => {
  return `${internalNamespaces.platformCore}.${toolName}`;
};

/**
 * Ids of built-in agentBuilder tools
 */
export const platformCoreTools = {
  indexExplorer: platformCoreTool('index_explorer'),
  search: platformCoreTool('search'),
  listIndices: platformCoreTool('list_indices'),
  getIndexMapping: platformCoreTool('get_index_mapping'),
  getDocumentById: platformCoreTool('get_document_by_id'),
  generateEsql: platformCoreTool('generate_esql'),
  executeEsql: platformCoreTool('execute_esql'),
  createVisualization: platformCoreTool('create_visualization'),
  getWorkflowExecutionStatus: platformCoreTool('get_workflow_execution_status'),
  productDocumentation: platformCoreTool('product_documentation'),
  cases: platformCoreTool('cases'),
  integrationKnowledge: platformCoreTool('integration_knowledge'),
  // Attachment tools
  attachmentRead: platformCoreTool('attachment_read'),
  attachmentUpdate: platformCoreTool('attachment_update'),
  attachmentAdd: platformCoreTool('attachment_add'),
  attachmentList: platformCoreTool('attachment_list'),
  attachmentDiff: platformCoreTool('attachment_diff'),
} as const;

export const filestoreTools = {
  read: `${internalNamespaces.filestore}.read`,
  ls: `${internalNamespaces.filestore}.ls`,
  grep: `${internalNamespaces.filestore}.grep`,
  glob: `${internalNamespaces.filestore}.glob`,
};

/**
 * List of tool types which can be created / edited by a user.
 */
export const editableToolTypes: ToolType[] = [
  ToolType.esql,
  ToolType.index_search,
  ToolType.workflow,
  ToolType.mcp,
];

export const defaultAgentToolIds = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.getWorkflowExecutionStatus,
];

/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export const activeToolsCountWarningThreshold = 24;
