/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from './definition';
export { isReservedToolId, validateToolId, toolIdRegexp, toolIdMaxLength } from './tool_ids';
export {
  platformCoreTools,
  activeToolsCountWarningThreshold,
  defaultAgentToolIds,
  editableToolTypes,
} from './constants';
export {
  type ByIdsToolSelection,
  type ToolSelection,
  type ToolSelectionRelevantFields,
  isByIdsToolSelection,
  toolMatchSelection,
  filterToolsBySelection,
  allToolsSelectionWildcard,
  allToolsSelection,
  TOOL_SELECTION_SCHEMA,
} from './tool_selection';
export {
  type EsqlToolConfig,
  EsqlToolFieldType,
  type EsqlToolFieldTypes,
  type EsqlToolParam,
  type EsqlToolDefinition,
  type EsqlToolDefinitionWithSchema,
  isEsqlTool,
} from './esql';
export {
  isIndexSearchTool,
  type IndexSearchToolDefinition,
  type IndexSearchToolDefinitionWithSchema,
  type IndexSearchToolConfig,
} from './index_search';
export {
  ToolResultType,
  type ToolResult,
  type ErrorResult,
  type QueryResult,
  type ResourceResult,
  type TabularDataResult,
  type OtherResult,
} from './tool_result';
export {
  internalNamespaces,
  protectedNamespaces,
  isInProtectedNamespace,
  hasProtectedNamespaceName,
} from './namespaces';
