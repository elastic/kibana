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
import {
  type ChatEvent,
  type Conversation,
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
} from '@kbn/onechat-common';
import { withConverseSpan } from '../../tracing';
import type { ConversationService } from '../conversation';
import type { ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle,
  handleCancellation,
  executeAgent$,
  getConversation,
  conversationExists,
  updateConversation$,
  createConversation$,
  resolveServices,
  convertErrors,
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

type ConversationOperation = 'CREATE' | 'UPDATE';

interface ConversationContext {
  operation: ConversationOperation;
  conversation: Conversation;
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
      // Step 1: Resolve services (connector, chat model, conversation client)
      return defer(async () => {
        const services = await resolveServices({
          agentId,
          connectorId,
          request,
          ...this.dependencies,
        });

        span?.setAttribute('elastic.connector.id', services.selectedConnectorId);

        // Step 2: Determine conversation operation (CREATE or UPDATE)
        const operation = await determineOperation({
          conversationId,
          autoCreateConversationWithId,
          conversationClient: services.conversationClient,
        });

        // Step 3: Get conversation (resolve it once here)
        const conversation = await getConversation({
          agentId,
          conversationId,
          autoCreateConversationWithId,
          conversationClient: services.conversationClient,
        });

        // Step 4: Build conversation context
        const context: ConversationContext = {
          operation,
          conversation,
          conversationClient: services.conversationClient,
          chatModel: services.chatModel,
          selectedConnectorId: services.selectedConnectorId,
        };

        return context;
      }).pipe(
        switchMap((context) => {
          // Step 5: Emit conversation ID for new conversations
          const conversationIdEvent$ =
            context.operation === 'CREATE'
              ? of(createConversationIdSetEvent(context.conversation.id))
              : EMPTY;

          // Step 6: Execute agent
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

          // Step 7: Generate title (for CREATE) or use existing title (for UPDATE)
          const title$ =
            context.operation === 'CREATE'
              ? generateTitle({
                  chatModel: context.chatModel,
                  conversation: context.conversation,
                  nextInput,
                })
              : of(context.conversation.title);

          // Step 8: Persist conversation
          const persistenceEvents$ = createPersistenceEvents({
            agentId,
            operation: context.operation,
            conversation: context.conversation,
            conversationClient: context.conversationClient,
            conversationId,
            title$,
            agentEvents$,
          });

          // Step 9: Merge all event streams
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
 * Determines whether this is a CREATE or UPDATE operation
 */
const determineOperation = async ({
  conversationId,
  autoCreateConversationWithId,
  conversationClient,
}: {
  conversationId?: string;
  autoCreateConversationWithId: boolean;
  conversationClient: ConversationClient;
}): Promise<ConversationOperation> => {
  // No conversation ID means we're creating a new one
  if (!conversationId) {
    return 'CREATE';
  }

  // If conversationId specified and autoCreate is false, we're updating an existing conversation
  if (!autoCreateConversationWithId) {
    return 'UPDATE';
  }

  // If conversationId specified and autoCreate is true, we check if the conversation exists
  const exists = await conversationExists({ conversationId, conversationClient });

  return exists ? 'UPDATE' : 'CREATE';
};

/**
 * Creates events for conversation persistence (create/update)
 */
const createPersistenceEvents = ({
  agentId,
  operation,
  conversation,
  conversationClient,
  conversationId,
  title$,
  agentEvents$,
}: {
  agentId: string;
  operation: ConversationOperation;
  conversation: Conversation;
  conversationClient: ConversationClient;
  conversationId?: string;
  title$: Observable<string>;
  agentEvents$: Observable<ChatEvent>;
}): Observable<ChatEvent> => {
  const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

  if (operation === 'CREATE') {
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
