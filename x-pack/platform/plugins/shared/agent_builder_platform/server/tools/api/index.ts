/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../../types';
import { apiDiscoverTool } from './discover';
import { apiDescribeTool } from './describe';
import { apiExecuteTool } from './execute';

/**
 * Builds the experimental API introspection/invocation tools (discover, describe,
 * execute) that operate against Elasticsearch and Kibana HTTP APIs.
 */
export const apiTools = (
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>
): Array<BuiltinToolDefinition<any>> => [
  apiDiscoverTool(),
  apiDescribeTool(),
  apiExecuteTool(coreSetup),
];
