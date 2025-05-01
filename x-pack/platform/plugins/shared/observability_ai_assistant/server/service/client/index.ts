/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { notFound, forbidden } from '@hapi/boom';
import objectHash from 'object-hash';
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

import { HASH_REGEX, unhashString } from '../../../common/utils/redaction';
import { buildDetectedEntitiesMap } from '../../../common/utils/build_detected_entities_map';
import { getRegexEntities } from '../../../common/utils/get_regex_entities';
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
  type InferenceChunk,
  KnowledgeBaseType,
  KnowledgeBaseEntryRole,
  DetectedEntity,
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
import { populateMissingSemanticTextFieldMigration } from '../startup_migrations/populate_missing_semantic_text_field_migration';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { getElserModelId } from '../knowledge_base_service/get_elser_model_id';
import { apmInstrumentation } from './operators/apm_instrumentation';
import { reIndexKnowledgeBaseWithLock } from '../knowledge_base_service/reindex_knowledge_base';

const MAX_FUNCTION_CALLS = 8;
const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';

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
  async inferNER(chunks: InferenceChunk[]): Promise<DetectedEntity[]> {
    const promises = chunks.map(async ({ chunkText, charStartOffset }) => {
      let response;
      try {
        response = await this.dependencies.esClient.asCurrentUser.ml.inferTrainedModel({
          model_id: NER_MODEL_ID,
          docs: [{ text_field: chunkText }],
        });
      } catch (error) {
        // If the model doesn't exist or the call fails, return no entities for this chunk
        return [];
      }
      const entities = response?.inference_results?.[0]?.entities ?? [];
      const adjustedEntities = entities.map((entity) => ({
        ...entity,
        start_pos: entity.start_pos + charStartOffset,
        end_pos: entity.end_pos + charStartOffset,
        hash: objectHash({ entity: entity.entity, class_name: entity.class_name }),
        type: 'ner' as const,
      }));

      return adjustedEntities;
    });

    const settled = await Promise.all(promises);
    return settled.flat();
  }

  /**
   * Replace every placeholder in message with its real value
   * (taken from `hashMap`) and generate entities.
   */
  private processAssistantMessage(
    contentWithHashes: string,
    hashMap: Map<string, { value: string; class_name: string; type: DetectedEntity['type'] }>
  ) {
    const detectedEntities: DetectedEntity[] = [];
    let unhashedText = '';
    let cursor = 0;

    let match: RegExpExecArray | null;
    while ((match = HASH_REGEX.exec(contentWithHashes)) !== null) {
      const [hash] = match;
      const rep = hashMap.get(hash);
      if (!rep) {
        continue; // keep unknown hash as‑is
      }

      // copy segment before the hash
      unhashedText += contentWithHashes.slice(cursor, match.index);

      // insert real value & capture span
      const start = unhashedText.length;
      unhashedText += rep.value;
      const end = unhashedText.length;

      detectedEntities.push({
        entity: rep.value,
        class_name: rep.class_name,
        start_pos: start,
        end_pos: end,
        type: rep.type,
        hash,
      });

      cursor = match.index + hash.length;
    }

    unhashedText += contentWithHashes.slice(cursor);
    return { unhashedText, detectedEntities };
  }
  /**
   * New user messages are anonymised (NER + regex) and their entities stored.
   * Assistant messages have any {hash} placeholders replaced with the original values.
   *
   * The function keeps a running `hashMap` built from all previously detected
   * entities so that assistant placeholders originating from earlier user
   * messages can be restored.
   *
   * If a message already has `detected_entities` it is skipped.
   *
   * @param messages
   * @returns         Same array instance with in-place edits.
   */
  async anonymizeMessages(messages: Message[]): Promise<{ anonymizedMessages: Message[] }> {
    if (!this.dependencies.config.enableAnonymization) {
      return { anonymizedMessages: messages };
    }
    const hashMap = buildDetectedEntitiesMap(messages);

    for (const message of messages) {
      if (message.message.detected_entities) continue;

      const { role, content } = message.message;
      if (role === 'user' && content) {
        const chunks = chunkTextByChar(content);
        const nerEntities = await this.inferNER(chunks);
        const regexEntities = getRegexEntities(content);

        const combined = [...nerEntities, ...regexEntities];
        const deduped = combined.filter((ent) =>
          // Regex entities take precedence over NER entities
          ent.type === 'regex'
            ? true
            : // check for intersecting ranges
              !regexEntities.some((re) => ent.start_pos < re.end_pos && ent.end_pos > re.start_pos)
        );

        message.message.detected_entities = deduped.map((ent) => ({
          entity: ent.entity,
          class_name: ent.class_name,
          start_pos: ent.start_pos,
          end_pos: ent.end_pos,
          type: ent.type,
          hash: ent.hash,
        }));
        // cache for assistant message reversal
        deduped.forEach((ent) =>
          hashMap.set(ent.hash, {
            value: ent.entity,
            class_name: ent.class_name,
            type: ent.type,
          })
        );
        // Assistant messages might include {hash} placeholders coming back
        // from the LLM – resolve them to real values here using the building map.
      } else if (role === 'assistant') {
        if (content) {
          const { unhashedText, detectedEntities } = this.processAssistantMessage(content, hashMap);
          message.message.content = unhashedText;
          message.message.detected_entities = detectedEntities;
        }
        // TODO: unhash other places?
        if (message.message.function_call?.arguments) {
          message.message.function_call.arguments = unhashString(
            message.message.function_call.arguments,
            hashMap
          );
        }
      }
    }

    return { anonymizedMessages: messages };
  }
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
              availableFunctionNames: functionClient.getFunctions().map((fn) => fn.definition.name),
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
                  // Call anonymizeMessages on history + new messages
                  return from(this.anonymizeMessages(initialMessages.concat(addedMessages))).pipe(
                    switchMap(({ anonymizedMessages: allAnonymizedMessages }) => {
                      // Extract only the newly sanitised messages (the tail of allAnonyimizedMessages):
                      const newAnonymizedMessages = allAnonymizedMessages.slice(
                        initialMessages.length
                      );

                      // merge back for downstream processing
                      const initialMessagesWithAddedMessages =
                        initialMessages.concat(newAnonymizedMessages);

                      const lastMessage = last(initialMessagesWithAddedMessages);

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
                              { messages: initialMessagesWithAddedMessages, systemMessage },
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
                          messages: initialMessagesWithAddedMessages,
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
          apmInstrumentation('complete'),
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
      toolChoice,
      tools,
      functionCalling: (simulateFunctionCalling ? 'simulated' : 'auto') as FunctionCallingMode,
      metadata: {
        connectorTelemetry: {
          pluginId: 'observability_ai_assistant',
        },
      },
    };
    if (stream) {
      return defer(() =>
        from(this.anonymizeMessages(messages)).pipe(
          switchMap(({ anonymizedMessages }) => {
            this.dependencies.logger.debug(
              () =>
                `Calling inference client for name: "${name}" with options: ${JSON.stringify(
                  options
                )}`
            );
            return this.dependencies.inferenceClient.chatComplete({
              ...options,
              stream: true,
              messages: convertMessagesForInference(anonymizedMessages, this.dependencies.logger),
            });
          })
        )
      ).pipe(
        convertInferenceEventsToStreamingEvents(),
        apmInstrumentation(name),
        failOnNonExistingFunctionCall({ functions }),
        tap((event) => {
          if (event.type === StreamingChatResponseEventType.ChatCompletionChunk) {
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
        messages: convertMessagesForInference(messages, this.dependencies.logger),
        stream: false,
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
      index: resourceNames.aliases.conversations,
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

    populateMissingSemanticTextFieldMigration({
      core,
      logger,
      config: this.dependencies.config,
    }).catch((e) => {
      this.dependencies.logger.error(
        `Failed to populate missing semantic text fields: ${e.message}`
      );
    });

    return res;
  };

  resetKnowledgeBase = () => {
    const { esClient } = this.dependencies;
    return this.dependencies.knowledgeBaseService.reset(esClient);
  };

  reIndexKnowledgeBaseWithLock = () => {
    return reIndexKnowledgeBaseWithLock({
      core: this.dependencies.core,
      esClient: this.dependencies.esClient,
      logger: this.dependencies.logger,
    });
  };

  reIndexKnowledgeBaseAndPopulateSemanticTextField = () => {
    return populateMissingSemanticTextFieldMigration({
      core: this.dependencies.core,
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

function chunkTextByChar(text: string, maxChars = 1000): InferenceChunk[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    const chunk = text.slice(i, i + maxChars);
    chunks.push({ chunkText: chunk, charStartOffset: i });
  }
  return chunks;
}
