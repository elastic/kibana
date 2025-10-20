/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import {
  filter,
  of,
  defer,
  shareReplay,
  forkJoin,
  switchMap,
  merge,
  throwError,
  map,
  take,
  EMPTY,
} from 'rxjs';
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
  getChatModel$,
  executeAgent$,
  getConversation$,
  conversationExists$,
  updateConversation$,
  createConversation$,
  convertErrors,
} from './utils';
import { createConversationIdSetEvent } from './utils/events';
import { resolveSelectedConnectorId } from './utils/resolve_selected_connector_id';
import type { ChatService, ChatConverseParams } from './types';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export const createChatService = (options: ChatServiceOptions): ChatService => {
  return new ChatServiceImpl(options);
};

class ChatServiceImpl implements ChatService {
  private readonly inference: InferenceServerStart;
  private readonly logger: Logger;
  private readonly conversationService: ConversationService;
  private readonly agentService: AgentsServiceStart;
  private readonly uiSettings: UiSettingsServiceStart;
  private readonly savedObjects: SavedObjectsServiceStart;

  constructor({
    inference,
    logger,
    conversationService,
    agentService,
    uiSettings,
    savedObjects,
  }: ChatServiceOptions) {
    this.inference = inference;
    this.logger = logger;
    this.conversationService = conversationService;
    this.agentService = agentService;
    this.uiSettings = uiSettings;
    this.savedObjects = savedObjects;
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
      return defer(() =>
        resolveSelectedConnectorId({
          uiSettings: this.uiSettings,
          savedObjects: this.savedObjects,
          request,
          connectorId,
          inference: this.inference,
        })
      ).pipe(
        switchMap((selectedConnectorId) => {
          if (!selectedConnectorId) {
            return throwError(() => new Error('No connector available for chat execution'));
          }

          return forkJoin({
            conversationClient: defer(async () =>
              this.conversationService.getScopedClient({ request })
            ),
            agent: defer(async () => {
              const agentRegistry = await this.agentService.getRegistry({ request });
              return agentRegistry.get(agentId);
            }),
            chatModel: getChatModel$({
              connectorId: selectedConnectorId,
              request,
              inference: this.inference,
              span,
            }),
            selectedConnectorId: of(selectedConnectorId),
          });
        }),
        switchMap(({ conversationClient, chatModel, agent, selectedConnectorId }) => {
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
            agentService: this.agentService,
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
            convertErrors({ logger: this.logger }),
            shareReplay()
          );
        })
      );
    });
  }
}
