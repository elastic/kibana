/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredTool } from '@kbn/onechat-server';
import type { ToolsServiceSetup } from '../services/tools';
import {
  listIndicesTool,
  getIndexMappingsTool,
  getDocumentByIdTool,
  searchFulltextTool,
  searchDslTool,
  rerankDocumentsTool,
  nlToEsqlTool,
  executeEsqlTool,
} from './retrieval';
import { researcherTool } from '../services/agents/research';

export const registerTools = ({ tools: registry }: { tools: ToolsServiceSetup }) => {
  const tools: Array<RegisteredTool<any, any>> = [
    listIndicesTool(),
    getIndexMappingsTool(),
    getDocumentByIdTool(),
    searchFulltextTool(),
    searchDslTool(),
    rerankDocumentsTool(),
    nlToEsqlTool(),
    executeEsqlTool(),
    researcherTool(),
  ];

  tools.forEach((tool) => {
    registry.register(tool);
  });
};
