/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderAccessChecker } from './access/access';
import type { AgentBuilderStartDependencies } from '../types';
import type { AgentService } from './agents';
import type { AttachmentsService } from './attachments';
import type { ChatService } from './chat';
import type { ConversationsService } from './conversations';
import type { DocLinksService } from './doc_links';
import type { ToolsService } from './tools';
import type { NavigationService } from './navigation';
import type { EventsService } from './events';

export interface AgentBuilderInternalService {
  agentService: AgentService;
  attachmentsService: AttachmentsService;
  chatService: ChatService;
  conversationsService: ConversationsService;
  docLinksService: DocLinksService;
  navigationService: NavigationService;
  toolsService: ToolsService;
  startDependencies: AgentBuilderStartDependencies;
  accessChecker: AgentBuilderAccessChecker;
  eventsService: EventsService;
}
