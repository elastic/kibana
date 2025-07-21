/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@kbn/logging';
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
  Observable,
} from 'rxjs';
import { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  AgentMode,
  type RoundInput,
  type Conversation,
  type ChatEvent,
  type ChatAgentEvent,
  type RoundCompleteEvent,
  oneChatDefaultAgentId,
  isRoundCompleteEvent,
  isOnechatError,
  createInternalError,
} from '@kbn/onechat-common';
import { withConverseSpan, getCurrentTraceId } from '../../tracing';
import { getConnectorList, getDefaultConnector } from '../runner/utils';
import type { ConversationService, ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import {
  createConversationCreatedEvent,
  createConversationUpdatedEvent,
  generateConversationTitle,
} from './utils';

interface ChatServiceOptions {
  logger: Logger;
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  conversationService: ConversationService;
  agentService: AgentsServiceStart;
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
   * Agent mode to use for this round of conversation.
   */
  mode?: AgentMode;
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
    agentId = oneChatDefaultAgentId,
    mode = AgentMode.normal,
    conversationId,
    connectorId,
    request,
    nextInput,
  }: ChatConverseParams): Observable<ChatEvent> {
    const isNewConversation = !conversationId;

    return withConverseSpan({ agentId, mode, conversationId }, (span) => {
      return forkJoin({
        conversationClient: defer(async () =>
          this.conversationService.getScopedClient({ request })
        ),
        agent: defer(async () => {
          const agentClient = await this.agentService.getScopedClient({ request });
          return agentClient.get(agentId);
        }),
        chatModel: defer(async () => {
          let selectedConnectorId = connectorId;
          if (!selectedConnectorId) {
            const connectors = await getConnectorList({ actions: this.actions, request });
            const defaultConnector = getDefaultConnector({ connectors });
            selectedConnectorId = defaultConnector.connectorId;
          }
          span?.setAttribute('elastic.connector.id', selectedConnectorId);
          return selectedConnectorId;
        }).pipe(
          switchMap((selectedConnectorId) => {
            return this.inference.getChatModel({
              request,
              connectorId: selectedConnectorId,
              chatModelOptions: {},
            });
          })
        ),
      }).pipe(
        switchMap(({ conversationClient, chatModel, agent }) => {
          const conversation$ = getConversation$({
            agentId,
            conversationId,
            conversationClient,
          });
          const agentEvents$ = getExecutionEvents$({
            agentId,
            request,
            mode,
            conversation$,
            nextInput,
            agentService: this.agentService,
          });

          const title$ = isNewConversation
            ? generatedTitle$({ chatModel, conversation$, nextInput })
            : conversation$.pipe(
                switchMap((conversation) => {
                  return of(conversation.title);
                })
              );

          const roundCompletedEvents$ = agentEvents$.pipe(filter(isRoundCompleteEvent));

          const saveOrUpdateAndEmit$ = isNewConversation
            ? createConversation$({
                agentId,
                conversationClient,
                title$,
                roundCompletedEvents$,
              })
            : updateConversation$({
                conversationClient,
                conversation$,
                title$,
                roundCompletedEvents$,
              });

          return merge(agentEvents$, saveOrUpdateAndEmit$).pipe(
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

const generatedTitle$ = ({
  chatModel,
  conversation$,
  nextInput,
}: {
  chatModel: InferenceChatModel;
  conversation$: Observable<Conversation>;
  nextInput: RoundInput;
}) => {
  return conversation$.pipe(
    switchMap((conversation) => {
      return defer(async () =>
        generateConversationTitle({
          previousRounds: conversation.rounds,
          nextInput,
          chatModel,
        })
      ).pipe(shareReplay());
    })
  );
};

/**
 * Persist a new conversation and emit the corresponding event
 */
const createConversation$ = ({
  agentId,
  conversationClient,
  title$,
  roundCompletedEvents$,
}: {
  agentId: string;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      return conversationClient.create({
        title,
        agent_id: agentId,
        rounds: [roundCompletedEvent.data.round],
      });
    }),
    switchMap((createdConversation) => {
      return of(createConversationCreatedEvent(createdConversation));
    })
  );
};

/**
 * Update an existing conversation and emit the corresponding event
 */
const updateConversation$ = ({
  conversationClient,
  conversation$,
  title$,
  roundCompletedEvents$,
}: {
  title$: Observable<string>;
  conversation$: Observable<Conversation>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
}) => {
  return forkJoin({
    conversation: conversation$,
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ conversation, title, roundCompletedEvent }) => {
      return conversationClient.update({
        id: conversation.id,
        title,
        rounds: [...conversation.rounds, roundCompletedEvent.data.round],
      });
    }),
    switchMap((updatedConversation) => {
      return of(createConversationUpdatedEvent(updatedConversation));
    })
  );
};

const getExecutionEvents$ = ({
  agentId,
  request,
  agentService,
  conversation$,
  mode,
  nextInput,
}: {
  agentId: string;
  request: KibanaRequest;
  agentService: AgentsServiceStart;
  conversation$: Observable<Conversation>;
  mode: AgentMode;
  nextInput: RoundInput;
}): Observable<ChatAgentEvent> => {
  return conversation$.pipe(
    switchMap((conversation) => {
      return new Observable<ChatAgentEvent>((observer) => {
        agentService
          .execute({
            request,
            agentId,
            agentParams: {
              agentMode: mode,
              nextInput,
              conversation: conversation.rounds,
            },
            onEvent: (event) => {
              observer.next(event);
            },
          })
          .then(
            () => {
              observer.complete();
            },
            (err) => {
              observer.error(err);
            }
          );

        return () => {};
      });
    }),
    shareReplay()
  );
};

const getConversation$ = ({
  agentId,
  conversationId,
  conversationClient,
}: {
  agentId: string;
  conversationId: string | undefined;
  conversationClient: ConversationClient;
}): Observable<Conversation> => {
  return defer(() => {
    if (conversationId) {
      return conversationClient.get(conversationId);
    } else {
      return of(placeholderConversation({ agentId }));
    }
  }).pipe(shareReplay());
};

const placeholderConversation = ({ agentId }: { agentId: string }): Conversation => {
  return {
    id: uuidv4(),
    title: 'New conversation',
    agent_id: agentId,
    rounds: [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: {
      id: 'unknown',
      username: 'unknown',
    },
  };
};
