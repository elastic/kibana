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
  generateWorkflow: platformCoreTool('generate_workflow'),
  executeEsql: platformCoreTool('execute_esql'),
  createVisualization: platformCoreTool('create_visualization'),
  getWorkflowExecutionStatus: platformCoreTool('get_workflow_execution_status'),
  resumeWorkflowExecution: platformCoreTool('resume_workflow_execution'),
  productDocumentation: platformCoreTool('product_documentation'),
  cases: platformCoreTool('cases'),
  integrationKnowledge: platformCoreTool('integration_knowledge'),
  // SML tools
  smlSearch: platformCoreTool('sml_search'),
  smlAttach: platformCoreTool('sml_attach'),
  // Connector tools
  executeConnectorSubAction: platformCoreTool('execute_connector_sub_action'),
} as const;

/**
 * Sig Events tools should try to follow this naming convention when possible:
 * {namespace}.sig_events.{feature}_{entity}_{action}
 *
 * - {feature} refers to a high-level scope within Sig Events, for example KIs.
 * - {entity} is a more granular entity withing the {feature} scope, for example Feature KI or Query KI.
 * - {action} the action to perform on the entity
 */
export const platformStreamsSigEventsTools = {
  searchKnowledgeIndicators: `${internalNamespaces.platformStreams}.sig_events.ki_search`,
  createFeatureKnowledgeIndicator: `${internalNamespaces.platformStreams}.sig_events.ki_feature_create`,
  createQueryKnowledgeIndicator: `${internalNamespaces.platformStreams}.sig_events.ki_query_create`,
} as const;

export const attachmentTools = {
  read: `${internalNamespaces.attachments}.read`,
  update: `${internalNamespaces.attachments}.update`,
  add: `${internalNamespaces.attachments}.add`,
  list: `${internalNamespaces.attachments}.list`,
  diff: `${internalNamespaces.attachments}.diff`,
};

export const filestoreTools = {
  read: `${internalNamespaces.filestore}.read`,
  ls: `${internalNamespaces.filestore}.ls`,
  grep: `${internalNamespaces.filestore}.grep`,
  glob: `${internalNamespaces.filestore}.glob`,
};

export const internalTools = {
  subAgentTool: 'run_subagent',
  sleepTool: 'sleep',
  writeTodosTool: 'write_todos',
};

export const isAttachmentTool = (toolName: string) =>
  Object.values(attachmentTools).includes(toolName);

export const isFilestoreTool = (toolName: string) =>
  Object.values(filestoreTools).includes(toolName);

const isInternalToolName = (toolName: string) => Object.values(internalTools).includes(toolName);

export const isInternalTool = (toolName: string) =>
  isAttachmentTool(toolName) || isFilestoreTool(toolName) || isInternalToolName(toolName);

export const isExcludedFromFilestore = (toolName: string) => isInternalTool(toolName);

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
  platformCoreTools.resumeWorkflowExecution,
  platformCoreTools.smlSearch,
  platformCoreTools.smlAttach,
  platformCoreTools.executeConnectorSubAction,
];

/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export const activeToolsCountWarningThreshold = 24;
