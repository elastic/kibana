/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, of, defer, shareReplay, switchMap, merge, EMPTY } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { type ChatEvent, oneChatDefaultAgentId, isRoundCompleteEvent } from '@kbn/onechat-common';
import { withConverseSpan } from '../../tracing';
import type { ConversationService } from '../conversation';
import type { ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle,
  handleCancellation,
  executeAgent$,
  getConversation,
  updateConversation$,
  createConversation$,
  resolveServices,
  convertErrors,
  type ConversationWithOperation,
} from './utils';
import { createConversationIdSetEvent } from './utils/events';
import type { ChatService, ChatConverseParams } from './types';

interface ChatServiceDeps {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export const createChatService = (options: ChatServiceDeps): ChatService => {
  return new ChatServiceImpl(options);
};

interface ConversationContext {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  chatModel: InferenceChatModel;
  selectedConnectorId: string;
}

class ChatServiceImpl implements ChatService {
  private readonly dependencies: ChatServiceDeps;

  constructor(deps: ChatServiceDeps) {
    this.dependencies = deps;
  }

  converse({
    agentId = oneChatDefaultAgentId,
    conversationId,
    connectorId,
    capabilities,
    request,
    abortSignal,
    nextInput,
    autoCreateConversationWithId = false,
  }: ChatConverseParams): Observable<ChatEvent> {
    return withConverseSpan({ agentId, conversationId }, (span) => {
      // Resolve scoped services
      return defer(async () => {
        const services = await resolveServices({
          agentId,
          connectorId,
          request,
          ...this.dependencies,
        });

        span?.setAttribute('elastic.connector.id', services.selectedConnectorId);

        // Get conversation and determine operation (CREATE or UPDATE)
        const conversation = await getConversation({
          agentId,
          conversationId,
          autoCreateConversationWithId,
          conversationClient: services.conversationClient,
        });

        // Build conversation context
        const context: ConversationContext = {
          conversation,
          conversationClient: services.conversationClient,
          chatModel: services.chatModel,
          selectedConnectorId: services.selectedConnectorId,
        };

        return context;
      }).pipe(
        switchMap((context) => {
          // Emit conversation ID for new conversations
          const conversationIdEvent$ =
            context.conversation.operation === 'CREATE'
              ? of(createConversationIdSetEvent(context.conversation.id))
              : EMPTY;

          // Execute agent
          const agentEvents$ = executeAgent$({
            agentId,
            request,
            nextInput,
            capabilities,
            abortSignal,
            conversation: context.conversation,
            defaultConnectorId: context.selectedConnectorId,
            agentService: this.dependencies.agentService,
          });

          // Generate title (for CREATE) or use existing title (for UPDATE)
          const title$ =
            context.conversation.operation === 'CREATE'
              ? generateTitle({
                  chatModel: context.chatModel,
                  conversation: context.conversation,
                  nextInput,
                })
              : of(context.conversation.title);

          // Persist conversation
          const persistenceEvents$ = persistConversation({
            agentId,
            conversation: context.conversation,
            conversationClient: context.conversationClient,
            conversationId,
            title$,
            agentEvents$,
          });

          // Merge all event streams
          return merge(conversationIdEvent$, agentEvents$, persistenceEvents$).pipe(
            handleCancellation(abortSignal),
            convertErrors({ logger: this.dependencies.logger }),
            shareReplay()
          );
        })
      );
    });
  }
}

/**
 * Creates events for conversation persistence (create/update)
 */
const persistConversation = ({
  agentId,
  conversation,
  conversationClient,
  conversationId,
  title$,
  agentEvents$,
}: {
  agentId: string;
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  conversationId?: string;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  if (conversation.operation === 'CREATE') {
    return createConversation$({
      agentId,
      conversationClient,
      conversationId: conversationId || conversation.id,
      title$,
      roundCompletedEvents$,
    });
  }

  return updateConversation$({
    conversationClient,
    conversation,
    title$,
    roundCompletedEvents$,
  });
};
