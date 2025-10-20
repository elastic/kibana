/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter, of, defer, shareReplay, switchMap, merge, map, take, EMPTY } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { type ChatEvent, oneChatDefaultAgentId, isRoundCompleteEvent } from '@kbn/onechat-common';
import { withConverseSpan } from '../../tracing';
import type { ConversationService } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  generateTitle$,
  handleCancellation,
  executeAgent$,
  getConversation$,
  conversationExists$,
  updateConversation$,
  createConversation$,
  convertErrors,
} from './utils';
import { createConversationIdSetEvent } from './utils/events';
import type { ChatService, ChatConverseParams } from './types';
import { resolveServices } from './resolve_services';

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
    const isNewConversation = !conversationId;

    return withConverseSpan({ agentId, conversationId }, (span) => {
      return defer(() => {
        return resolveServices({
          agentId,
          connectorId,
          request,
          ...this.dependencies,
        });
      }).pipe(
        switchMap(({ conversationClient, chatModel, selectedConnectorId }) => {
          span?.setAttribute('elastic.connector.id', selectedConnectorId);

          const shouldCreateNewConversation$ = isNewConversation
            ? of(true)
            : autoCreateConversationWithId
            ? conversationExists$({ conversationId, conversationClient }).pipe(
                switchMap((exists) => of(!exists))
              )
            : of(false);

          const conversation$ = getConversation$({
            agentId,
            conversationId,
            autoCreateConversationWithId,
            conversationClient,
          });

          // Extract the ID from the conversation and emit the event ONLY for new conversations
          const conversationIdSetEvent$ = shouldCreateNewConversation$.pipe(
            switchMap((shouldCreate) =>
              shouldCreate
                ? conversation$.pipe(
                    map((conversation) => createConversationIdSetEvent(conversation.id)),
                    take(1)
                  )
                : EMPTY
            )
          );

          const agentEvents$ = executeAgent$({
            agentId,
            request,
            conversation$,
            nextInput,
            capabilities,
            abortSignal,
            agentService: this.dependencies.agentService,
            defaultConnectorId: selectedConnectorId,
          });

          const title$ = shouldCreateNewConversation$.pipe(
            switchMap((shouldCreate) =>
              shouldCreate
                ? generateTitle$({ chatModel, conversation$, nextInput })
                : conversation$.pipe(
                    switchMap((conversation) => {
                      return of(conversation.title);
                    })
                  )
            )
          );

          const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

          const saveOrUpdateAndEmit$ = shouldCreateNewConversation$.pipe(
            switchMap((shouldCreate) =>
              shouldCreate
                ? conversation$.pipe(
                    switchMap((conversation) =>
                      createConversation$({
                        agentId,
                        conversationClient,
                        conversationId: conversationId || conversation.id,
                        title$,
                        roundCompletedEvents$,
                      })
                    )
                  )
                : updateConversation$({
                    conversationClient,
                    conversation$,
                    title$,
                    roundCompletedEvents$,
                  })
            )
          );

          return merge(conversationIdSetEvent$, agentEvents$, saveOrUpdateAndEmit$).pipe(
            handleCancellation(abortSignal),
            convertErrors({ logger: this.dependencies.logger }),
            shareReplay()
          );
        })
      );
    });
  }
}
