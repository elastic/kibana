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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  type RoundInput,
  type Conversation,
  type ChatEvent,
  type ChatAgentEvent,
  type RoundCompleteEvent,
  OneChatDefaultAgentId,
  isRoundCompleteEvent,
} from '@kbn/onechat-common';
import type { ExecutableConversationalAgent } from '@kbn/onechat-server';
import { getConnectorList, getDefaultConnector } from '../runner/utils';
import type { ConversationService, ConversationClient } from '../conversation';
import type { AgentsServiceStart } from '../agents';
import { createConversationCreatedEvent, createConversationUpdatedEvent } from './utils';

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

export interface ChatConverseParams {
  agentId?: string;
  connectorId?: string;
  conversationId?: string;
  nextInput: RoundInput;
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
    agentId = OneChatDefaultAgentId,
    conversationId,
    connectorId,
    request,
    nextInput,
  }: {
    agentId?: string;
    connectorId?: string;
    conversationId?: string;
    nextInput: RoundInput;
    request: KibanaRequest;
  }) {
    const isNewConversation = !conversationId;

    return forkJoin({
      conversationClient: defer(async () => this.conversationService.getScopedClient({ request })),
      agent: defer(async () =>
        this.agentService.registry.asPublicRegistry().get({ agentId, request })
      ),
      chatModel: defer(async () => {
        if (connectorId) {
          return connectorId;
        }
        const connectors = await getConnectorList({ actions: this.actions, request });
        const defaultConnector = getDefaultConnector({ connectors });
        return defaultConnector.connectorId;
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
        // TODO: generate title
        const title$ = of('New conversation');

        const conversation$ = getConversation$({ agentId, conversationId, conversationClient });
        const agentEvents$ = getExecutionEvents$({ agent, conversation$, nextInput });

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
            // TODO: catch/rethrow non onechat errors.
            this.logger.error(err);
            return throwError(err);
          })
        );
      })
    );
  }
}

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
        agentId,
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
  conversation$,
  nextInput,
  agent,
}: {
  conversation$: Observable<Conversation>;
  nextInput: RoundInput;
  agent: ExecutableConversationalAgent;
}): Observable<ChatAgentEvent> => {
  return conversation$.pipe(
    switchMap((conversation) => {
      return new Observable<ChatAgentEvent>((observer) => {
        agent
          .execute({
            agentParams: {
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
      }).pipe(shareReplay());
    })
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
    agentId,
    rounds: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    user: {
      id: 'unknown',
      username: 'unknown',
    },
  };
};
