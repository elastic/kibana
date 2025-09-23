/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from './definition';
import { internalNamespaces } from './namespaces';
import { schema, TypeOf } from '@kbn/config-schema';

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
export const editableToolTypes: ToolType[] = [ToolType.esql, ToolType.index_search];

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


export const TOOL_DEFINITION_SCHEMA = schema.object({
  id: schema.string(),
  // @ts-expect-error schema.oneOf expects at least one element, and `map` returns a list
  type: schema.oneOf(editableToolTypes.map((type) => schema.literal(type))),
  description: schema.string({ defaultValue: '' }),
  readonly: schema.boolean(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  // actual config validation is done in the tool service
  configuration: schema.recordOf(schema.string(), schema.any()),
});

export const TOOL_DEFINITION_WITH_SCHEMA_SCHEMA = schema.object({
  id: schema.string(),
  // @ts-expect-error schema.oneOf expects at least one element, and `map` returns a list
  type: schema.oneOf(editableToolTypes.map((type) => schema.literal(type))),
  description: schema.string({ defaultValue: '' }),
  readonly: schema.boolean(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  // actual config validation is done in the tool service
  configuration: schema.recordOf(schema.string(), schema.any()),
  schema: schema.object({}, { unknowns: 'allow' })
});