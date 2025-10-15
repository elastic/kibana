/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatStartDependencies } from '../types';
import type { AgentService } from './agents';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { ToolsService } from './tools';
import type { OAuthManager } from './oauth';
import type { McpService } from './mcp/mcp_service';
import type { ComposioService } from './composio/composio_service';

export interface OnechatInternalService {
  agentService: AgentService;
  chatService: ChatService;
  conversationsService: ConversationsService;
  toolsService: ToolsService;
  oauthManager: OAuthManager;
  mcpService: McpService;
  composioService: ComposioService;
  startDependencies: OnechatStartDependencies;
}
