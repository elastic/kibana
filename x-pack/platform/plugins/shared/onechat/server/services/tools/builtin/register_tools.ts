/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { BuiltinToolRegistry } from './builtin_registry';
import {
  getDocumentByIdTool,
  executeEsqlTool,
  naturalLanguageSearchTool,
  generateEsqlTool,
  relevanceSearchTool,
  getIndexMappingsTool,
  listIndicesTool,
  indexExplorerTool,
} from './definitions';

export const registerBuiltinTools = ({ registry }: { registry: BuiltinToolRegistry }) => {
  const tools: Array<BuiltinToolDefinition<any, any>> = [
    getDocumentByIdTool(),
    executeEsqlTool(),
    naturalLanguageSearchTool(),
    generateEsqlTool(),
    relevanceSearchTool(),
    getIndexMappingsTool(),
    listIndicesTool(),
    indexExplorerTool(),
  ];

  tools.forEach((tool) => {
    registry.register(tool);
  });
};
