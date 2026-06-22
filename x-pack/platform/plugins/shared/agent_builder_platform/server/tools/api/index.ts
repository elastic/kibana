/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { apiDiscoverTool as discoverTool } from './discover';
import { apiManualTool as manualTool } from './manual';
import { apiExecuteTool as executeTool } from './execute';

export const apiTools = (): Array<BuiltinToolDefinition<any>> => [
  discoverTool(),
  manualTool(),
  executeTool(),
];
