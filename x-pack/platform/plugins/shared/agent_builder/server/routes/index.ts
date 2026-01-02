/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';
import { registerToolsRoutes } from './tools';
import { registerInternalToolsRoutes } from './internal/tools';
import { registerInternalConversationRoutes } from './internal/conversations';
import { registerAgentRoutes } from './agents';
import { registerChatRoutes } from './chat';
import { registerConversationRoutes } from './conversations';
import { registerMCPRoutes } from './mcp';
import { registerA2ARoutes } from './a2a';

export const registerRoutes = (dependencies: RouteDependencies) => {
  registerToolsRoutes(dependencies);
  registerInternalToolsRoutes(dependencies);
  registerInternalConversationRoutes(dependencies);
  registerAgentRoutes(dependencies);
  registerChatRoutes(dependencies);
  registerConversationRoutes(dependencies);
  registerMCPRoutes(dependencies);
  registerA2ARoutes(dependencies);
};
