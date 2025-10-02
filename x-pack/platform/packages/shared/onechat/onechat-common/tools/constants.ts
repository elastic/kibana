/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from './definition';
import { internalNamespaces } from '../base/namespaces';

const platformCoreTool = (toolName: string) => {
  return `${internalNamespaces.platformCore}.${toolName}`;
};

/**
 * Ids of built-in onechat tools
 */
export const platformCoreTools = {
  indexExplorer: platformCoreTool('index_explorer'),
  search: platformCoreTool('search'),
  listIndices: platformCoreTool('list_indices'),
  getIndexMapping: platformCoreTool('get_index_mapping'),
  getDocumentById: platformCoreTool('get_document_by_id'),
  generateEsql: platformCoreTool('generate_esql'),
  executeEsql: platformCoreTool('execute_esql'),
} as const;

/**
 * List of tool types which can be created / edited by a user.
 */
export const editableToolTypes: ToolType[] = [
  ToolType.esql,
  ToolType.index_search,
  ToolType.workflow,
];

export const defaultAgentToolIds = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
];

/**
 * The number of active tools that will trigger a warning in the UI.
 * Agent will perform poorly if it has too many tools.
 */
export const activeToolsCountWarningThreshold = 24;
