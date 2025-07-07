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
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';
import { convertMessagesForInference } from '../../../common/convert_messages_for_inference';
import { CompatibleJSONSchema } from '../../../common/functions/types';
import {
  type Instruction,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
  KnowledgeBaseType,
  KnowledgeBaseEntryRole,
} from '../../../common/types';
import { CONTEXT_FUNCTION_NAME } from '../../functions/context';
import type { ChatFunctionClient } from '../chat_function_client';
import { KnowledgeBaseService, RecalledEntry } from '../knowledge_base_service';
import { getAccessQuery } from '../util/get_access_query';
import { getSystemMessageFromInstructions } from '../util/get_system_message_from_instructions';
import { failOnNonExistingFunctionCall } from './operators/fail_on_non_existing_function_call';
import { getContextFunctionRequestIfNeeded } from './get_context_function_request_if_needed';
import { LangTracer } from './instrumentation/lang_tracer';
import { continueConversation } from './operators/continue_conversation';
import { convertInferenceEventsToStreamingEvents } from './operators/convert_inference_events_to_streaming_events';
import { extractMessages } from './operators/extract_messages';
import { getGeneratedTitle } from './operators/get_generated_title';
import {
  reIndexKnowledgeBaseAndPopulateSemanticTextField,
  scheduleKbSemanticTextMigrationTask,
} from '../task_manager_definitions/register_kb_semantic_text_migration_task';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { getElserModelId } from '../knowledge_base_service/get_elser_model_id';
import { apmInstrumentation } from './operators/apm_instrumentation';

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
    userInstructions: apiUserInstructions = [],
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
    userInstructions?: Instruction[];
    simulateFunctionCalling?: boolean;
    disableFunctions?: boolean;
  }): Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>> => {
    return new LangTracer(context.active()).startActiveSpan(
      'complete',
      ({ tracer: completeTracer }) => {
        const isConversationUpdate = persist && !!predefinedConversationId;

        const conversationId = persist ? predefinedConversationId || v4() : '';

        if (persist && !isConversationUpdate && kibanaPublicUrl) {
          functionClient.registerInstruction(
            `This conversation will be persisted in Kibana and available at this url: ${
              kibanaPublicUrl + `/app/observabilityAIAssistant/conversations/${conversationId}`
            }.`
          );
        }

        const kbUserInstructions$ = from(this.getKnowledgeBaseUserInstructions()).pipe(
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
            : getGeneratedTitle({
                messages: initialMessages,
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
              }).pipe(shareReplay());

        const systemMessage$ = kbUserInstructions$.pipe(
          map((kbUserInstructions) => {
            return getSystemMessageFromInstructions({
              applicationInstructions: functionClient.getInstructions(),
              kbUserInstructions,
              apiUserInstructions,
              availableFunctionNames: disableFunctions
                ? []
                : functionClient.getFunctions().map((fn) => fn.definition.name),
            });
          }),
          shareReplay()
        );

        // we continue the conversation here, after resolving both the materialized
        // messages and the knowledge base instructions
        const nextEvents$ = forkJoin([systemMessage$, kbUserInstructions$]).pipe(
          switchMap(([systemMessage, kbUserInstructions]) => {
            // if needed, inject a context function request here
            const contextRequest = functionClient.hasFunction(CONTEXT_FUNCTION_NAME)
              ? getContextFunctionRequestIfNeeded(initialMessages)
              : undefined;

            return mergeOperator(
              // if we have added a context function request, also emit
              // the messageAdd event for it, so we can notify the consumer
              // and add it to the conversation
              ...(contextRequest ? [of(contextRequest)] : []),
              continueConversation({
                messages: [...initialMessages, ...(contextRequest ? [contextRequest.message] : [])],
                chat: (name, chatParams) => {
                  // inject a chat function with predefined parameters
                  return this.chat(name, {
                    systemMessage,
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
                kbUserInstructions,
                apiUserInstructions,
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
            // get just the new messages
            nextEvents$.pipe(extractMessages()),
            // get just the title, and drop the token count events
            title$.pipe(filter((value): value is string => typeof value === 'string')),
            systemMessage$,
          ]).pipe(
            switchMap(([addedMessages, title, systemMessage]) => {
              const initialMessagesWithAddedMessages = initialMessages.concat(addedMessages);

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

                      return from(
                        this.update(
                          conversationId,

                          merge(
                            {},

                            // base conversation without messages
                            omit(conversation._source, 'messages'),

                            // update messages and system message
                            { messages: initialMessagesWithAddedMessages, systemMessage },

                            // update title
                            {
                              conversation: {
                                title: title || conversation._source?.conversation.title,
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
                  },
                  public: !!isPublic,
                  labels: {},
                  numeric_labels: {},
                  systemMessage,
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
            })
          )
        );

        return output$.pipe(
          apmInstrumentation('complete'),
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
      systemMessage,
      messages,
      connectorId,
      functions,
      functionCall,
      signal,
      simulateFunctionCalling,
      tracer,
      stream,
    }: {
      systemMessage?: string;
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
    ? Observable<ChatCompletionChunkEvent | ChatCompletionMessageEvent>
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
      system: systemMessage,
      messages: convertMessagesForInference(messages),
      toolChoice,
      tools,
      functionCalling: (simulateFunctionCalling ? 'simulated' : 'auto') as FunctionCallingMode,
      metadata: {
        connectorTelemetry: {
          pluginId: 'observability_ai_assistant',
        },
      },
    };

    this.dependencies.logger.debug(
      () =>
        `Calling inference client with for name: "${name}" with options: ${JSON.stringify(options)}`
    );

    if (stream) {
      return defer(() =>
        this.dependencies.inferenceClient.chatComplete({
          ...options,
          temperature: 0.25,
          stream: true,
          maxRetries: 0,
        })
      ).pipe(
        convertInferenceEventsToStreamingEvents(),
        apmInstrumentation(name),
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
        ? Observable<ChatCompletionChunkEvent | ChatCompletionMessageEvent>
        : never;
    } else {
      return this.dependencies.inferenceClient.chatComplete({
        ...options,
        stream: false,
        temperature: 0.25,
        maxRetries: 0,
      }) as TStream extends true ? never : Promise<ChatCompleteResponse>;
    }
  }

  find = async (options?: { query?: string }): Promise<Conversation[]> => {
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

    return response.hits.hits.map((hit) => hit._source!);
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
      .then(([_, pluginsStart]) =>
        scheduleKbSemanticTextMigrationTask({ taskManager: pluginsStart.taskManager, logger })
      )
      .catch((error) => {
        logger.error(`Failed to schedule semantic text migration task: ${error}`);
      });

    return res;
  };

  resetKnowledgeBase = () => {
    const { esClient } = this.dependencies;
    return this.dependencies.knowledgeBaseService.reset(esClient);
  };

  reIndexKnowledgeBaseAndPopulateSemanticTextField = () => {
    return reIndexKnowledgeBaseAndPopulateSemanticTextField({
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

    const existingId = await this.dependencies.knowledgeBaseService.getPersonalUserInstructionId({
      isPublic: entry.public,
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
    });

    if (existingId) {
      this.dependencies.logger.debug(
        `Updating user instruction. id = "${existingId}", user = "${this.dependencies.user?.name}"`
      );
      entry.id = existingId;
    } else {
      this.dependencies.logger.debug(
        `Creating user instruction. id = "${entry.id}", user = "${this.dependencies.user?.name}"`
      );
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
    return this.dependencies.knowledgeBaseService.getEntries({
      query,
      sortBy,
      sortDirection,
      namespace: this.dependencies.namespace,
    });
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
