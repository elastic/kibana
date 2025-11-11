/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { correlationEngineTool } from './correlation_engine_tool';
import { entityExtractionTool } from './entity_extraction_tool';
import { semanticSearchTool } from './semantic_search_tool';

export function registerCorrelationTool(toolsSetup: ToolsSetup, logger: Logger): void {
  toolsSetup.register(correlationEngineTool());
  toolsSetup.register(entityExtractionTool());
  toolsSetup.register(semanticSearchTool());
}
