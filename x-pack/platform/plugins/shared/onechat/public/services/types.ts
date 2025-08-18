/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentService } from './agents';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { DataService } from './data';
import type { ToolsService } from './tools';

export interface OnechatInternalService {
  agentService: AgentService;
  chatService: ChatService;
  conversationsService: ConversationsService;
  dataService: DataService;
  toolsService: ToolsService;
}
