/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Observable } from 'rxjs';
import {
  filter,
  of,
  defer,
  shareReplay,
  forkJoin,
  switchMap,
  merge,
  catchError,
  throwError,
} from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  type RoundInput,
  type ChatEvent,
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
  isOnechatError,
  createInternalError,
} from '@kbn/onechat-common';
import { withConverseSpan, getCurrentTraceId } from '../../tracing';
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
} from './utils';
import { resolveSelectedConnectorId } from './utils/resolve_selected_connector_id';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export interface ChatService {
  converse(params: ChatConverseParams): Observable<ChatEvent>;
}

/**
 * Parameters for {@link ChatService.converse}
 */
export interface ChatConverseParams {
  /**
   * Id of the conversational agent to converse with.
   * If empty, will use the default agent id.
   */
  agentId?: string;
  /**
   * Id of the genAI connector to use.
   * If empty, will use the default connector.
   */
  connectorId?: string;
  /**
   * Id of the conversation to continue.
   * If empty, will create a new conversation instead.
   */
  conversationId?: string;
  /**
   * Create conversation with specified ID if not found.
   * Defaults to false. Has no effect when conversationId is not provided.
   */
  autoCreateConversationWithId?: boolean;
  /**
   * Optional abort signal to handle cancellation.
   * Canceled rounds will not be persisted.
   */
  abortSignal?: AbortSignal;
  /**
   * Next user input to start the round.
   */
  nextInput: RoundInput;
  /**
   * Request bound to this call.
   */
  request: KibanaRequest;
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
    request,
    abortSignal,
    nextInput,
    autoCreateConversationWithId = false,
  }: ChatConverseParams): Observable<ChatEvent> {
    const { inference } = this;
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
              inference,
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

          const agentEvents$ = executeAgent$({
            agentId,
            request,
            conversation$,
            nextInput,
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
                ? createConversation$({
                    agentId,
                    conversationClient,
                    conversationId,
                    title$,
                    roundCompletedEvents$,
                  })
                : updateConversation$({
                    conversationClient,
                    conversation$,
                    title$,
                    roundCompletedEvents$,
                  })
            )
          );

          return merge(agentEvents$, saveOrUpdateAndEmit$).pipe(
            handleCancellation(abortSignal),
            catchError((err) => {
              this.logger.error(`Error executing agent: ${err.stack}`);
              return throwError(() => {
                const traceId = getCurrentTraceId();
                if (isOnechatError(err)) {
                  err.meta = {
                    ...err.meta,
                    traceId,
                  };
                  return err;
                } else {
                  return createInternalError(`Error executing agent: ${err.message}`, {
                    statusCode: 500,
                    traceId,
                  });
                }
              });
            }),
            shareReplay()
          );
        })
      );
    });
  }
}
