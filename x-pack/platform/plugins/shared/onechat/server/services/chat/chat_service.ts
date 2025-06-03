/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  filter,
  map,
  toArray,
  of,
  mergeMap,
  defer,
  shareReplay,
  forkJoin,
  switchMap,
  merge,
  catchError,
  throwError,
  Observable,
} from 'rxjs';
import { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ConversationService } from '../conversation';
import type { AgentsServiceStart } from '../agents';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
}

export class ChatService {
  private readonly inference: InferenceServerStart;
  private readonly actions: ActionsPluginStart;
  private readonly logger: Logger;
  private readonly conversationService: ConversationService;
  private readonly agentService: AgentsServiceStart;

  constructor({
    inference,
    actions,
    logger,
    conversationService,
    agentService,
  }: ChatServiceOptions) {
    this.inference = inference;
    this.actions = actions;
    this.logger = logger;
    this.conversationService = conversationService;
    this.agentService = agentService;
  }

  converse({
    agentId,
    conversationId,
    connectorId,
    request,
    nextUserMessage,
  }: {
    agentId: string;
    connectorId: string;
    conversationId?: string;
    nextUserMessage: string;
    request: KibanaRequest;
  }) {
    // TODO
  }
}
