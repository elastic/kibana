/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { notFound, forbidden } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CoreSetup, ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
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
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import {
  ChatCompleteResponse,
  FunctionCallingMode,
  InferenceClient,
  ToolChoiceType,
} from '@kbn/inference-common';
import { isLockAcquisitionError } from '@kbn/lock-manager';
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
import { CONTEXT_FUNCTION_NAME } from '../../functions/context/context';
import type { ChatFunctionClient } from '../chat_function_client';
import { KnowledgeBaseService, RecalledEntry } from '../knowledge_base_service';
import { getAccessQuery } from '../util/get_access_query';
import { getSystemMessageFromInstructions } from '../util/get_system_message_from_instructions';
import { failOnNonExistingFunctionCall } from './operators/fail_on_non_existing_function_call';
import { getContextFunctionRequestIfNeeded } from './get_context_function_request_if_needed';
import { continueConversation } from './operators/continue_conversation';
import { convertInferenceEventsToStreamingEvents } from './operators/convert_inference_events_to_streaming_events';
import { extractMessages } from './operators/extract_messages';
import { getGeneratedTitle } from './operators/get_generated_title';
import { runStartupMigrations } from '../startup_migrations/run_startup_migrations';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { deleteInferenceEndpoint, waitForKbModel, warmupModel } from '../inference_endpoint';
import { reIndexKnowledgeBaseWithLock } from '../knowledge_base_service/reindex_knowledge_base';
import { createOrUpdateKnowledgeBaseIndexAssets } from '../index_assets/create_or_update_knowledge_base_index_assets';
import { getInferenceIdFromWriteIndex } from '../knowledge_base_service/get_inference_id_from_write_index';
import { LEGACY_CUSTOM_INFERENCE_ID } from '../../../common/preconfigured_inference_ids';
import { addAnonymizationData } from './operators/add_anonymization_data';

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
      index: resourceNames.writeIndexAlias.conversations,
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

  private isConversationOwnedByUser = (conversation: Conversation): boolean => {
    const user = this.dependencies.user;
    if (!conversation.user || !user) {
      return false;
    }

    return conversation.user.id && user.id
      ? conversation.user.id === user.id
      : conversation.user.name === user.name;
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

    if (!this.isConversationOwnedByUser(conversation._source!)) {
      throw forbidden('Deleting a conversation is only allowed for the owner of the conversation.');
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
    return withActiveInferenceSpan('RunTools', () => {
      const isConversationUpdate = persist && !!predefinedConversationId;
      const conversationId = persist ? predefinedConversationId || v4() : '';

      if (persist && !isConversationUpdate && kibanaPublicUrl) {
        functionClient.registerInstruction(
          `This conversation will be persisted in Kibana and available at this url: ${kibanaPublicUrl}/app/observabilityAIAssistant/conversations/${conversationId}.`
        );
      }

      const kbUserInstructions$ = from(this.getKnowledgeBaseUserInstructions()).pipe(shareReplay());

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
            }).pipe(shareReplay());

      const systemMessage$ = kbUserInstructions$.pipe(
        map((kbUserInstructions) =>
          getSystemMessageFromInstructions({
            applicationInstructions: functionClient.getInstructions(),
            kbUserInstructions,
            apiUserInstructions,
            availableFunctionNames: disableFunctions
              ? []
              : functionClient.getFunctions().map((fn) => fn.definition.name),
          })
        ),
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

          return withActiveInferenceSpan('ContinueConversation', () =>
            mergeOperator(
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
                connectorId,
                simulateFunctionCalling,
              })
            )
          );
        }),
        shareReplay()
      );

      const conversationWithMetaFields$ = from(
        this.getConversationWithMetaFields(conversationId)
      ).pipe(
        switchMap((conversation) => {
          if (isConversationUpdate && !conversation) {
            return throwError(() => createConversationNotFoundError());
          }

          if (conversation?._source && !this.isConversationOwnedByUser(conversation._source)) {
            return throwError(
              () => new Error('Cannot update conversation that is not owned by the user')
            );
          }

          return of(conversation);
        })
      );

      const output$ = conversationWithMetaFields$.pipe(
        switchMap((conversation) => {
          return mergeOperator(
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
                return nextEvents$.pipe(
                  addAnonymizationData(initialMessages.concat(addedMessages)),
                  switchMap((deanonymizedMessages) => {
                    const lastMessage = last(deanonymizedMessages);

                    // if a function request is at the very end, close the stream to consumer
                    // without persisting or updating the conversation. we need to wait
                    // on the function response to have a valid conversation
                    const isFunctionRequest = !!lastMessage?.message.function_call?.name;

                    if (!persist || isFunctionRequest) {
                      return of();
                    }

                    if (isConversationUpdate && conversation) {
                      return from(
                        this.update(
                          conversationId,

                          merge(
                            {},

                            // base conversation without messages
                            omit(conversation._source, 'messages'),

                            // update messages and system message
                            { messages: deanonymizedMessages, systemMessage },

                            // update title
                            {
                              conversation: {
                                title: title || conversation._source?.conversation.title,
                              },
                            }
                          )
                        )
                      ).pipe(
                        map((conversationUpdated): ConversationUpdateEvent => {
                          return {
                            conversation: conversationUpdated.conversation,
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
                        messages: deanonymizedMessages,
                        archived: false,
                      })
                    ).pipe(
                      map((conversationCreated): ConversationCreateEvent => {
                        return {
                          conversation: conversationCreated.conversation,
                          type: StreamingChatResponseEventType.ConversationCreate,
                        };
                      })
                    );
                  })
                );
              })
            )
          );
        })
      );

      return output$.pipe(
        catchError((error) => {
          this.dependencies.logger.error(error);
          return throwError(() => error);
        }),
        tap((event) => {
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
        }),
        shareReplay()
      );
    });
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
      stream,
    }: {
      systemMessage?: string;
      messages: Message[];
      connectorId: string;
      functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
      functionCall?: string;
      signal: AbortSignal;
      simulateFunctionCalling?: boolean;
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
      messages: convertMessagesForInference(messages, this.dependencies.logger),
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
        `Options for inference client for name: "${name}" before anonymization: ${JSON.stringify(
          options
        )}`
    );

    if (stream) {
      return defer(() =>
        this.dependencies.inferenceClient.chatComplete({
          ...options,
          temperature: 0.25,
          maxRetries: 0,
          stream: true,
        })
      ).pipe(
        convertInferenceEventsToStreamingEvents(),
        failOnNonExistingFunctionCall({ functions }),
        tap((event) => {
          if (event.type === StreamingChatResponseEventType.ChatCompletionChunk) {
            this.dependencies.logger.trace(
              () => `Received chunk: ${JSON.stringify(event.message)}`
            );
          }
        }),
        shareReplay()
      ) as TStream extends true
        ? Observable<ChatCompletionChunkEvent | ChatCompletionMessageEvent>
        : never;
    } else {
      return this.dependencies.inferenceClient.chatComplete({
        ...options,
        messages: convertMessagesForInference(messages, this.dependencies.logger),
        temperature: 0.25,
        maxRetries: 0,
        stream: false,
      }) as TStream extends true ? never : Promise<ChatCompleteResponse>;
    }
  }

  find = async (options?: { query?: string }): Promise<Conversation[]> => {
    const response = await this.dependencies.esClient.asInternalUser.search<Conversation>({
      index: resourceNames.writeIndexAlias.conversations,
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

    if (!this.isConversationOwnedByUser(persistedConversation._source!)) {
      throw forbidden('Updating a conversation is only allowed for the owner of the conversation.');
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
      index: resourceNames.writeIndexAlias.conversations,
      document: createdConversation,
      refresh: true,
    });

    return createdConversation;
  };

  updatePartial = async ({
    conversationId,
    updates,
  }: {
    conversationId: string;
    updates: Partial<{ public: boolean; archived: boolean }>;
  }): Promise<Conversation> => {
    const conversation = await this.get(conversationId);
    if (!conversation) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge({}, conversation, {
      ...(updates.public !== undefined && { public: updates.public }),
      ...(updates.archived !== undefined && { archived: updates.archived }),
    });

    return this.update(conversationId, updatedConversation);
  };

  duplicateConversation = async (conversationId: string): Promise<Conversation> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }
    const _source = conversation._source!;
    return this.create({
      ..._source,
      conversation: {
        ..._source.conversation,
        id: v4(),
      },
      public: false,
      archived: false,
    });
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

  getInferenceEndpointsForEmbedding = () => {
    return this.dependencies.knowledgeBaseService.getInferenceEndpointsForEmbedding();
  };

  getKnowledgeBaseStatus = () => {
    return this.dependencies.knowledgeBaseService.getModelStatus();
  };

  setupKnowledgeBase = async (
    nextInferenceId: string,
    waitUntilComplete: boolean = false
  ): Promise<{
    reindex: boolean;
    currentInferenceId: string | undefined;
    nextInferenceId: string;
  }> => {
    const { esClient, core, logger } = this.dependencies;

    logger.debug(`Setting up knowledge base with inference_id: ${nextInferenceId}`);

    const currentInferenceId = await getInferenceIdFromWriteIndex(esClient, logger);
    if (currentInferenceId === nextInferenceId) {
      logger.debug('Inference ID is unchanged. No need to re-index knowledge base.');
      const warmupModelPromise = warmupModel({ esClient, logger, inferenceId: nextInferenceId });
      if (waitUntilComplete) {
        logger.debug('Waiting for warmup to complete...');
        await warmupModelPromise;
        logger.debug('Warmup completed.');
      }
      return { reindex: false, currentInferenceId, nextInferenceId };
    }

    await createOrUpdateKnowledgeBaseIndexAssets({
      core: this.dependencies.core,
      logger: this.dependencies.logger,
      inferenceId: nextInferenceId,
    });

    const kbSetupPromise = waitForKbModel({
      core: this.dependencies.core,
      esClient,
      logger,
      config: this.dependencies.config,
      inferenceId: nextInferenceId,
    })
      .then(async () => {
        logger.info(
          `Inference ID has changed from "${currentInferenceId}" to "${nextInferenceId}". Re-indexing knowledge base.`
        );

        await reIndexKnowledgeBaseWithLock({
          core,
          logger,
          esClient,
        });

        // If the inference ID switched to a preconfigured inference endpoint, delete the legacy custom inference endpoint if it exists.
        if (currentInferenceId === LEGACY_CUSTOM_INFERENCE_ID) {
          void deleteInferenceEndpoint({
            esClient,
            logger,
            inferenceId: LEGACY_CUSTOM_INFERENCE_ID,
          });
        }
      })
      .catch((e) => {
        if (isLockAcquisitionError(e)) {
          logger.info(e.message);
        } else {
          logger.error(
            `Failed to setup knowledge base with inference_id: ${nextInferenceId}. Error: ${e.message}`
          );
          logger.debug(e);
        }
      });

    if (waitUntilComplete) {
      logger.debug('Waiting for knowledge base setup to complete...');
      await kbSetupPromise;
      logger.debug('Knowledge base setup completed.');
    }

    return { reindex: true, currentInferenceId, nextInferenceId };
  };

  warmupKbModel = (inferenceId: string) => {
    const { esClient, logger } = this.dependencies;

    logger.debug(`Warming up model for for inference ID: ${inferenceId}`);
    warmupModel({ esClient, logger, inferenceId }).catch(() => {});
    return;
  };

  reIndexKnowledgeBaseWithLock = () => {
    return reIndexKnowledgeBaseWithLock({
      core: this.dependencies.core,
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
    });
  };

  runStartupMigrations = () => {
    return runStartupMigrations({
      core: this.dependencies.core,
      logger: this.dependencies.logger,
      config: this.dependencies.config,
    });
  };

  addUserInstruction = async ({
    entry,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp' | 'type' | 'role'>;
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

  addKnowledgeBaseBulkEntries = async ({
    entries,
  }: {
    entries: Array<Omit<KnowledgeBaseEntry, '@timestamp' | 'type'>>;
  }): Promise<void> => {
    return this.dependencies.knowledgeBaseService.addBulkEntries({
      entries: entries.map((entry) => ({
        ...entry,
        type: KnowledgeBaseType.Contextual,
      })),
      user: this.dependencies.user,
      namespace: this.dependencies.namespace,
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
