/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { notFound } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CoreSetup, ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { context } from '@opentelemetry/api';
import { last, merge, omit } from 'lodash';
import {
  catchError,
  combineLatest,
  defer,
  filter,
  forkJoin,
  from,
  map,
  merge as mergeOperator,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { v4 } from 'uuid';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { InferenceClient } from '@kbn/inference-plugin/server';
import { ChatCompleteResponse, FunctionCallingMode, ToolChoiceType } from '@kbn/inference-common';

import { resourceNames } from '..';
import {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  ChatCompletionErrorEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  createConversationNotFoundError,
  StreamingChatResponseEventType,
  TokenCountEvent,
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';
import { convertMessagesForInference } from '../../../common/convert_messages_for_inference';
import { CompatibleJSONSchema } from '../../../common/functions/types';
import {
  type AdHocInstruction,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
  KnowledgeBaseType,
  KnowledgeBaseEntryRole,
  MessageRole,
} from '../../../common/types';
import { withoutTokenCountEvents } from '../../../common/utils/without_token_count_events';
import { CONTEXT_FUNCTION_NAME } from '../../functions/context';
import type { ChatFunctionClient } from '../chat_function_client';
import { KnowledgeBaseService, RecalledEntry } from '../knowledge_base_service';
import { getAccessQuery } from '../util/get_access_query';
import { getSystemMessageFromInstructions } from '../util/get_system_message_from_instructions';
import { replaceSystemMessage } from '../util/replace_system_message';
import { failOnNonExistingFunctionCall } from './operators/fail_on_non_existing_function_call';
import { getContextFunctionRequestIfNeeded } from './get_context_function_request_if_needed';
import { LangTracer } from './instrumentation/lang_tracer';
import { continueConversation } from './operators/continue_conversation';
import { convertInferenceEventsToStreamingEvents } from './operators/convert_inference_events_to_streaming_events';
import { extractMessages } from './operators/extract_messages';
import { extractTokenCount } from './operators/extract_token_count';
import { getGeneratedTitle } from './operators/get_generated_title';
import { instrumentAndCountTokens } from './operators/instrument_and_count_tokens';
import {
  runSemanticTextKnowledgeBaseMigration,
  scheduleSemanticTextMigration,
} from '../task_manager_definitions/register_migrate_knowledge_base_entries_task';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { getElserModelId } from '../knowledge_base_service/get_elser_model_id';

const MAX_FUNCTION_CALLS = 8;

export class ObservabilityAIAssistantClient {
  constructor(
    private readonly dependencies: {
      config: ObservabilityAIAssistantConfig;
      core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
      actionsClient: PublicMethodsOf<ActionsClient>;
      uiSettingsClient: IUiSettingsClient;
      namespace: string;
      esClient: {
        asInternalUser: ElasticsearchClient;
        asCurrentUser: ElasticsearchClient;
      };
      inferenceClient: InferenceClient;
      logger: Logger;
      user?: {
        id?: string;
        name: string;
      };
      knowledgeBaseService: KnowledgeBaseService;
      scopes: AssistantScope[];
    }
  ) {}

  private getConversationWithMetaFields = async (
    conversationId: string
  ): Promise<SearchHit<Conversation> | undefined> => {
    const response = await this.dependencies.esClient.asInternalUser.search<Conversation>({
      index: resourceNames.aliases.conversations,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
              namespace: this.dependencies.namespace,
            }),
            { term: { 'conversation.id': conversationId } },
          ],
        },
      },
      size: 1,
      terminate_after: 1,
    });

    return response.hits.hits[0];
  };

  private getConversationUpdateValues = (lastUpdated: string) => {
    return {
      conversation: {
        last_updated: lastUpdated,
      },
      user: this.dependencies.user,
      namespace: this.dependencies.namespace,
    };
  };

  get = async (conversationId: string): Promise<Conversation> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }
    return conversation._source!;
  };

  delete = async (conversationId: string): Promise<void> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }

    await this.dependencies.esClient.asInternalUser.delete({
      id: conversation._id!,
      index: conversation._index,
      refresh: true,
    });
  };

  complete = ({
    functionClient,
    connectorId,
    simulateFunctionCalling = false,
    instructions: adHocInstructions = [],
    messages: initialMessages,
    signal,
    persist,
    kibanaPublicUrl,
    isPublic,
    title: predefinedTitle,
    conversationId: predefinedConversationId,
    disableFunctions = false,
  }: {
    messages: Message[];
    connectorId: string;
    signal: AbortSignal;
    functionClient: ChatFunctionClient;
    persist: boolean;
    conversationId?: string;
    title?: string;
    isPublic?: boolean;
    kibanaPublicUrl?: string;
    instructions?: AdHocInstruction[];
    simulateFunctionCalling?: boolean;
    disableFunctions?:
      | boolean
      | {
          except: string[];
        };
  }): Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>> => {
    return new LangTracer(context.active()).startActiveSpan(
      'complete',
      ({ tracer: completeTracer }) => {
        const isConversationUpdate = persist && !!predefinedConversationId;

        const conversationId = persist ? predefinedConversationId || v4() : '';

        if (persist && !isConversationUpdate && kibanaPublicUrl) {
          adHocInstructions.push({
            instruction_type: 'application_instruction',
            text: `This conversation will be persisted in Kibana and available at this url: ${
              kibanaPublicUrl + `/app/observabilityAIAssistant/conversations/${conversationId}`
            }.`,
          });
        }

        const userInstructions$ = from(this.getKnowledgeBaseUserInstructions()).pipe(shareReplay());

        const registeredAdhocInstructions = functionClient.getAdhocInstructions();
        const allAdHocInstructions = adHocInstructions.concat(registeredAdhocInstructions);

        // from the initial messages, override any system message with
        // the one that is based on the instructions (registered, request, kb)
        const messagesWithUpdatedSystemMessage$ = userInstructions$.pipe(
          map((userInstructions) => {
            // this is what we eventually store in the conversation
            const messagesWithUpdatedSystemMessage = replaceSystemMessage(
              getSystemMessageFromInstructions({
                applicationInstructions: functionClient.getInstructions(),
                userInstructions,
                adHocInstructions: allAdHocInstructions,
                availableFunctionNames: functionClient
                  .getFunctions()
                  .map((fn) => fn.definition.name),
              }),
              initialMessages
            );

            return messagesWithUpdatedSystemMessage;
          }),
          shareReplay()
        );

        // if it is:
        // - a new conversation
        // - no predefined title is given
        // - we need to store the conversation
        // we generate a title
        // if not, we complete with an empty string
        const title$ =
          predefinedTitle || isConversationUpdate || !persist
            ? of(predefinedTitle || '').pipe(shareReplay())
            : messagesWithUpdatedSystemMessage$.pipe(
                switchMap((messages) =>
                  getGeneratedTitle({
                    messages,
                    logger: this.dependencies.logger,
                    chat: (name, chatParams) =>
                      this.chat(name, {
                        ...chatParams,
                        simulateFunctionCalling,
                        connectorId,
                        signal,
                        stream: false,
                      }),
                    tracer: completeTracer,
                  })
                ),
                shareReplay()
              );

        // we continue the conversation here, after resolving both the materialized
        // messages and the knowledge base instructions
        const nextEvents$ = combineLatest([
          messagesWithUpdatedSystemMessage$,
          userInstructions$,
        ]).pipe(
          switchMap(([messagesWithUpdatedSystemMessage, userInstructions]) => {
            // if needed, inject a context function request here
            const contextRequest = functionClient.hasFunction(CONTEXT_FUNCTION_NAME)
              ? getContextFunctionRequestIfNeeded(messagesWithUpdatedSystemMessage)
              : undefined;

            return mergeOperator(
              // if we have added a context function request, also emit
              // the messageAdd event for it, so we can notify the consumer
              // and add it to the conversation
              ...(contextRequest ? [of(contextRequest)] : []),
              continueConversation({
                messages: [
                  ...messagesWithUpdatedSystemMessage,
                  ...(contextRequest ? [contextRequest.message] : []),
                ],
                chat: (name, chatParams) => {
                  // inject a chat function with predefined parameters
                  return this.chat(name, {
                    ...chatParams,
                    signal,
                    simulateFunctionCalling,
                    connectorId,
                    stream: true,
                  });
                },
                // start out with the max number of function calls
                functionCallsLeft: MAX_FUNCTION_CALLS,
                functionClient,
                userInstructions,
                adHocInstructions,
                signal,
                logger: this.dependencies.logger,
                disableFunctions,
                tracer: completeTracer,
                connectorId,
                simulateFunctionCalling,
              })
            );
          }),
          shareReplay()
        );

        const output$ = mergeOperator(
          // get all the events from continuing the conversation
          nextEvents$,
          // wait until all dependencies have completed
          forkJoin([
            messagesWithUpdatedSystemMessage$,
            // get just the new messages
            nextEvents$.pipe(withoutTokenCountEvents(), extractMessages()),
            // count all the token count events emitted during completion
            mergeOperator(
              nextEvents$,
              title$.pipe(filter((value): value is TokenCountEvent => typeof value !== 'string'))
            ).pipe(extractTokenCount()),
            // get just the title, and drop the token count events
            title$.pipe(filter((value): value is string => typeof value === 'string')),
          ]).pipe(
            switchMap(
              ([messagesWithUpdatedSystemMessage, addedMessages, tokenCountResult, title]) => {
                const initialMessagesWithAddedMessages =
                  messagesWithUpdatedSystemMessage.concat(addedMessages);

                const lastMessage = last(initialMessagesWithAddedMessages);

                // if a function request is at the very end, close the stream to consumer
                // without persisting or updating the conversation. we need to wait
                // on the function response to have a valid conversation
                const isFunctionRequest = !!lastMessage?.message.function_call?.name;

                if (!persist || isFunctionRequest) {
                  return of();
                }

                if (isConversationUpdate) {
                  return from(this.getConversationWithMetaFields(conversationId))
                    .pipe(
                      switchMap((conversation) => {
                        if (!conversation) {
                          return throwError(() => createConversationNotFoundError());
                        }

                        const persistedTokenCount = conversation._source?.conversation
                          .token_count ?? {
                          prompt: 0,
                          completion: 0,
                          total: 0,
                        };

                        return from(
                          this.update(
                            conversationId,

                            merge(
                              {},

                              // base conversation without messages
                              omit(conversation._source, 'messages'),

                              // update messages
                              { messages: initialMessagesWithAddedMessages },

                              // update token count
                              {
                                conversation: {
                                  title: title || conversation._source?.conversation.title,
                                  token_count: {
                                    prompt: persistedTokenCount.prompt + tokenCountResult.prompt,
                                    completion:
                                      persistedTokenCount.completion + tokenCountResult.completion,
                                    total: persistedTokenCount.total + tokenCountResult.total,
                                  },
                                },
                              }
                            )
                          )
                        );
                      })
                    )
                    .pipe(
                      map((conversation): ConversationUpdateEvent => {
                        return {
                          conversation: conversation.conversation,
                          type: StreamingChatResponseEventType.ConversationUpdate,
                        };
                      })
                    );
                }

                return from(
                  this.create({
                    '@timestamp': new Date().toISOString(),
                    conversation: {
                      title,
                      id: conversationId,
                      token_count: tokenCountResult,
                    },
                    public: !!isPublic,
                    labels: {},
                    numeric_labels: {},
                    messages: initialMessagesWithAddedMessages,
                  })
                ).pipe(
                  map((conversation): ConversationCreateEvent => {
                    return {
                      conversation: conversation.conversation,
                      type: StreamingChatResponseEventType.ConversationCreate,
                    };
                  })
                );
              }
            )
          )
        );

        return output$.pipe(
          instrumentAndCountTokens('complete'),
          withoutTokenCountEvents(),
          catchError((error) => {
            this.dependencies.logger.error(error);
            return throwError(() => error);
          }),
          tap((event) => {
            if (this.dependencies.logger.isLevelEnabled('debug')) {
              switch (event.type) {
                case StreamingChatResponseEventType.MessageAdd:
                  this.dependencies.logger.debug(
                    () => `Added message: ${JSON.stringify(event.message)}`
                  );
                  break;

                case StreamingChatResponseEventType.ConversationCreate:
                  this.dependencies.logger.debug(
                    () => `Created conversation: ${JSON.stringify(event.conversation)}`
                  );
                  break;

                case StreamingChatResponseEventType.ConversationUpdate:
                  this.dependencies.logger.debug(
                    () => `Updated conversation: ${JSON.stringify(event.conversation)}`
                  );
                  break;
              }
            }
          }),
          shareReplay()
        );
      }
    );
  };

  chat<TStream extends boolean>(
    name: string,
    {
      messages,
      connectorId,
      functions,
      functionCall,
      signal,
      simulateFunctionCalling,
      tracer,
      stream,
    }: {
      messages: Message[];
      connectorId: string;
      functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
      functionCall?: string;
      signal: AbortSignal;
      simulateFunctionCalling?: boolean;
      tracer: LangTracer;
      stream: TStream;
    }
  ): TStream extends true
    ? Observable<ChatCompletionChunkEvent | TokenCountEvent | ChatCompletionMessageEvent>
    : Promise<ChatCompleteResponse> {
    let tools: Record<string, { description: string; schema: any }> | undefined;
    let toolChoice: ToolChoiceType | { function: string } | undefined;

    if (functions?.length) {
      tools = functions.reduce((acc, fn) => {
        acc[fn.name] = {
          description: fn.description,
          schema: fn.parameters,
        };
        return acc;
      }, {} as Record<string, { description: string; schema: any }>);

      toolChoice = functionCall
        ? {
            function: functionCall,
          }
        : ToolChoiceType.auto;
    }

    const options = {
      connectorId,
      messages: convertMessagesForInference(
        messages.filter((message) => message.message.role !== MessageRole.System)
      ),
      toolChoice,
      tools,
      functionCalling: (simulateFunctionCalling ? 'simulated' : 'auto') as FunctionCallingMode,
    };

    if (stream) {
      return defer(() =>
        this.dependencies.inferenceClient.chatComplete({
          ...options,
          stream: true,
        })
      ).pipe(
        convertInferenceEventsToStreamingEvents(),
        instrumentAndCountTokens(name),
        failOnNonExistingFunctionCall({ functions }),
        tap((event) => {
          if (
            event.type === StreamingChatResponseEventType.ChatCompletionChunk &&
            this.dependencies.logger.isLevelEnabled('trace')
          ) {
            this.dependencies.logger.trace(`Received chunk: ${JSON.stringify(event.message)}`);
          }
        }),
        shareReplay()
      ) as TStream extends true
        ? Observable<ChatCompletionChunkEvent | TokenCountEvent | ChatCompletionMessageEvent>
        : never;
    } else {
      return this.dependencies.inferenceClient.chatComplete({
        ...options,
        stream: false,
      }) as TStream extends true ? never : Promise<ChatCompleteResponse>;
    }
  }

  find = async (options?: { query?: string }): Promise<{ conversations: Conversation[] }> => {
    const response = await this.dependencies.esClient.asInternalUser.search<Conversation>({
      index: resourceNames.aliases.conversations,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
              namespace: this.dependencies.namespace,
            }),
          ],
        },
      },
      sort: {
        '@timestamp': 'desc',
      },
      size: 100,
    });

    return {
      conversations: response.hits.hits.map((hit) => hit._source!),
    };
  };

  update = async (
    conversationId: string,
    conversation: ConversationUpdateRequest
  ): Promise<Conversation> => {
    const persistedConversation = await this.getConversationWithMetaFields(conversationId);

    if (!persistedConversation) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge(
      {},
      conversation,
      this.getConversationUpdateValues(new Date().toISOString())
    );

    await this.dependencies.esClient.asInternalUser.update({
      id: persistedConversation._id!,
      index: persistedConversation._index,
      doc: updatedConversation,
      refresh: true,
    });

    return updatedConversation;
  };

  setTitle = async ({ conversationId, title }: { conversationId: string; title: string }) => {
    const document = await this.getConversationWithMetaFields(conversationId);
    if (!document) {
      throw notFound();
    }

    const conversation = await this.get(conversationId);

    if (!conversation) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge(
      {},
      conversation,
      { conversation: { title } },
      this.getConversationUpdateValues(new Date().toISOString())
    );

    await this.dependencies.esClient.asInternalUser.update({
      id: document._id!,
      index: document._index,
      doc: { conversation: { title } },
      refresh: true,
    });

    return updatedConversation;
  };

  create = async (conversation: ConversationCreateRequest): Promise<Conversation> => {
    const now = new Date().toISOString();

    const createdConversation: Conversation = merge(
      {},
      conversation,
      {
        '@timestamp': now,
        conversation: { id: conversation.conversation.id || v4() },
      },
      this.getConversationUpdateValues(now)
    );

    await this.dependencies.esClient.asInternalUser.index({
      index: resourceNames.aliases.conversations,
      document: createdConversation,
      refresh: true,
    });

    return createdConversation;
  };

  recall = async ({
    queries,
    categories,
    limit,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    limit?: { size?: number; tokenCount?: number };
  }): Promise<RecalledEntry[]> => {
    return (
      this.dependencies.knowledgeBaseService?.recall({
        namespace: this.dependencies.namespace,
        user: this.dependencies.user,
        queries,
        categories,
        esClient: this.dependencies.esClient,
        uiSettingsClient: this.dependencies.uiSettingsClient,
        limit,
      }) || []
    );
  };

  getKnowledgeBaseStatus = () => {
    return this.dependencies.knowledgeBaseService.getStatus();
  };

  setupKnowledgeBase = async (modelId: string | undefined) => {
    const { esClient, core, logger, knowledgeBaseService } = this.dependencies;

    if (!modelId) {
      modelId = await getElserModelId({ core, logger });
    }

    // setup the knowledge base
    const res = await knowledgeBaseService.setup(esClient, modelId);

    core
      .getStartServices()
      .then(([_, pluginsStart]) => {
        logger.debug('Schedule semantic text migration task');
        return scheduleSemanticTextMigration(pluginsStart);
      })
      .catch((error) => {
        logger.error(`Failed to run semantic text migration task: ${error}`);
      });

    return res;
  };

  resetKnowledgeBase = () => {
    const { esClient } = this.dependencies;
    return this.dependencies.knowledgeBaseService.reset(esClient);
  };

  migrateKnowledgeBaseToSemanticText = () => {
    return runSemanticTextKnowledgeBaseMigration({
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
      config: this.dependencies.config,
    });
  };

  addUserInstruction = async ({
    entry,
  }: {
    entry: Omit<
      KnowledgeBaseEntry,
      '@timestamp' | 'confidence' | 'is_correction' | 'type' | 'role'
    >;
  }): Promise<void> => {
    // for now we want to limit the number of user instructions to 1 per user
    // if a user instruction already exists for the user, we get the id and update it
    this.dependencies.logger.debug('Adding user instruction entry');
    const existingId = await this.dependencies.knowledgeBaseService.getPersonalUserInstructionId({
      isPublic: entry.public,
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
    });

    if (existingId) {
      entry.id = existingId;
      this.dependencies.logger.debug(`Updating user instruction with id "${existingId}"`);
    }

    return this.dependencies.knowledgeBaseService.addEntry({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      entry: {
        ...entry,
        confidence: 'high',
        is_correction: false,
        type: KnowledgeBaseType.UserInstruction,
        labels: {},
        role: KnowledgeBaseEntryRole.UserEntry,
      },
    });
  };

  addKnowledgeBaseEntry = async ({
    entry,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp' | 'type'>;
  }): Promise<void> => {
    return this.dependencies.knowledgeBaseService.addEntry({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      entry: {
        ...entry,
        type: KnowledgeBaseType.Contextual,
      },
    });
  };

  getKnowledgeBaseEntries = async ({
    query,
    sortBy,
    sortDirection,
  }: {
    query: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) => {
    return this.dependencies.knowledgeBaseService.getEntries({ query, sortBy, sortDirection });
  };

  deleteKnowledgeBaseEntry = async (id: string) => {
    return this.dependencies.knowledgeBaseService.deleteEntry({ id });
  };

  getKnowledgeBaseUserInstructions = async () => {
    return this.dependencies.knowledgeBaseService.getUserInstructions(
      this.dependencies.namespace,
      this.dependencies.user
    );
  };
}
