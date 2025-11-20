/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderAccessChecker } from './access/access';
import type { OnechatStartDependencies } from '../types';
import type { AgentService } from './agents';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { ToolsService } from './tools';
import type { NavigationService } from './navigation';

export interface OnechatInternalService {
  agentService: AgentService;
  chatService: ChatService;
  conversationsService: ConversationsService;
  navigationService: NavigationService;
  toolsService: ToolsService;
  startDependencies: OnechatStartDependencies;
  accessChecker: AgentBuilderAccessChecker;
}
