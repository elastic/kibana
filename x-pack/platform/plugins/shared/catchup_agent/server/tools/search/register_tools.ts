/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { searchUpdatesTool } from './search_updates_tool';
import { unifiedSearchTool } from './unified_search_tool';

export function registerSearchTool(toolsSetup: ToolsSetup, logger: Logger): void {
  toolsSetup.register(searchUpdatesTool());
  toolsSetup.register(unifiedSearchTool());
}
