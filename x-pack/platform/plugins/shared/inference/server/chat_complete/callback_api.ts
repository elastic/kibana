/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteOptions, AnonymizationRule } from '@kbn/inference-common';
import type { ChatCompleteAnonymizationTarget } from '@kbn/inference-common/src/chat_complete/metadata';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import { v4 as uuidv4 } from 'uuid';
import {
  createInferenceRequestError,
  getConnectorFamily,
  getConnectorProvider,
  getConnectorDefaultModel,
  type ChatCompleteCompositeResponse,
  MessageRole,
} from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { defer, forkJoin, from, identity, share, switchMap, throwError } from 'rxjs';
import { withChatCompleteSpan } from '@kbn/inference-tracing';
import type { ElasticsearchClient } from '@kbn/core/server';
import { omit } from 'lodash';
import { getInferenceAdapter } from './adapters';
import type { InferenceExecutor } from './utils';
import {
  chunksIntoMessage,
  getInferenceExecutor,
  handleCancellation,
  handleLifecycleCallbacks,
  streamToResponse,
} from './utils';
import type { InferenceCallbackManager } from '../inference_client/callback_manager';
import { retryWithExponentialBackoff } from '../../common/utils/retry_with_exponential_backoff';
import { getRetryFilter } from '../../common/utils/error_retry_filter';
import { anonymizeMessages } from './anonymization/anonymize_messages';
import { deanonymizeMessage } from './anonymization/deanonymize_message';
import { addAnonymizationInstruction } from './anonymization/add_anonymization_instruction';
import type { RegexWorkerService } from './anonymization/regex_worker_service';
import { ReplacementsRepository } from './anonymization/replacements/replacements_repository';

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  namespace: string;
  actions: ActionsPluginStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  replacementsEsClient?: ElasticsearchClient;
  replacementsEncryptionKey?: string;
  usePersistentReplacements?: boolean;
  callbackManager?: InferenceCallbackManager;
  saltPromise?: Promise<string | undefined>;
  resolveEffectivePolicy?: (
    target?: ChatCompleteAnonymizationTarget
  ) => Promise<EffectivePolicy | undefined>;
}

type CreateChatCompleteApiOptionsKey =
  | 'connectorId'
  | 'abortSignal'
  | 'stream'
  | 'retryConfiguration'
  | 'maxRetries';

type ChatCompleteApiWithCallbackInitOptions = Pick<
  ChatCompleteOptions,
  CreateChatCompleteApiOptionsKey
>;

export type ChatCompleteApiWithCallbackCallback = (
  connector: InferenceExecutor
) => Omit<ChatCompleteOptions, CreateChatCompleteApiOptionsKey>;

export type ChatCompleteApiWithCallback = (
  options: ChatCompleteApiWithCallbackInitOptions,
  callback: ChatCompleteApiWithCallbackCallback
) => ChatCompleteCompositeResponse;

export function createChatCompleteCallbackApi(
  options: CreateChatCompleteApiOptions
): ChatCompleteApiWithCallback;

export function createChatCompleteCallbackApi({
  request,
  namespace,
  actions,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  esClient,
  replacementsEsClient,
  replacementsEncryptionKey,
  usePersistentReplacements = true,
  callbackManager,
  saltPromise,
  resolveEffectivePolicy,
}: CreateChatCompleteApiOptions) {
  return (
    {
      connectorId,
      abortSignal,
      stream,
      maxRetries = 3,
      retryConfiguration = {},
    }: ChatCompleteApiWithCallbackInitOptions,
    callback: ChatCompleteApiWithCallbackCallback
  ) => {
    const inference$ = defer(() =>
      forkJoin({
        executor: from(getInferenceExecutor({ connectorId, request, actions })),
        anonymizationRules: from(anonymizationRulesPromise),
      })
    )
      .pipe(
        switchMap(({ executor, anonymizationRules }) => {
          const {
            system,
            messages: givenMessages,
            functionCalling,
            metadata,
            modelName,
            temperature,
            toolChoice,
            tools,
            timeout,
          } = callback(executor);

          const messages = givenMessages.map((message) => {
            // remove empty toolCalls array, spec doesn't like it
            if (
              message.role === MessageRole.Assistant &&
              message.toolCalls !== undefined &&
              message.toolCalls.length === 0
            ) {
              return omit(message, 'toolCalls');
            }
            return message;
          });

          return from(
            (async () => {
              const salt = await saltPromise;
              const effectivePolicy = await resolveEffectivePolicy?.(
                metadata?.anonymization?.target
              );
              if (!usePersistentReplacements) {
                const anonymization = await anonymizeMessages({
                  system,
                  messages,
                  anonymizationRules,
                  regexWorker,
                  esClient,
                  salt: salt ?? undefined,
                  effectivePolicy,
                });
                return { anonymization, replacementsId: undefined, effectivePolicy };
              }

              const carriedReplacementsId = metadata?.anonymization?.replacementsId;
              // Replacements are stored in a hidden `.kibana-*` system index. Use an internal client
              // for persistence so authorized Kibana users don't also need direct ES index privileges.
              const repo = new ReplacementsRepository(replacementsEsClient ?? esClient, {
                encryptionKey: replacementsEncryptionKey,
              });
              let replacementsId = carriedReplacementsId;
              let existingReplacements = carriedReplacementsId
                ? await repo.get(namespace, carriedReplacementsId)
                : null;
              if (carriedReplacementsId && !existingReplacements) {
                // Recover by allocating a new doc ID when caller carries a stale/unknown one.
                replacementsId = uuidv4();
              }

              const anonymization = await anonymizeMessages({
                system,
                messages,
                anonymizationRules,
                regexWorker,
                esClient,
                salt: salt ?? undefined,
                effectivePolicy,
                knownReplacements: existingReplacements?.replacements ?? [],
              });

              const replacements = anonymization.anonymizations.map(({ entity }) => ({
                anonymized: entity.mask,
                original: entity.value,
              }));
              const shouldPersistReplacements = Boolean(
                carriedReplacementsId || replacements.length
              );

              if (!shouldPersistReplacements) {
                return { anonymization, replacementsId: undefined, effectivePolicy };
              }

              replacementsId ??= uuidv4();

              if (existingReplacements) {
                const updated = await repo.update(namespace, replacementsId, { replacements });
                if (!updated) {
                  // Document disappeared between get/update; recover with new doc.
                  replacementsId = uuidv4();
                  existingReplacements = null;
                }
              }

              if (!existingReplacements) {
                await repo.create({
                  id: replacementsId,
                  namespace,
                  createdBy: 'inference',
                  replacements,
                });
              }

              return { anonymization, replacementsId, effectivePolicy };
            })()
          ).pipe(
            switchMap(({ anonymization, replacementsId, effectivePolicy }) => {
              const connector = executor.getConnector();
              const connectorType = connector.type;
              const inferenceAdapter = getInferenceAdapter(connectorType);

              if (!inferenceAdapter) {
                return throwError(() =>
                  createInferenceRequestError(
                    `Adapter for type ${connectorType} not implemented`,
                    400
                  )
                );
              }
              const systemWithAnonymizationInstructions = anonymization.system
                ? addAnonymizationInstruction(
                    anonymization.system,
                    anonymizationRules,
                    effectivePolicy
                  )
                : system;

              return withChatCompleteSpan(
                {
                  system: systemWithAnonymizationInstructions,
                  messages: anonymization.messages,
                  tools,
                  toolChoice,
                  model: {
                    id: modelName ?? getConnectorDefaultModel(connector),
                    family: getConnectorFamily(connector),
                    provider: getConnectorProvider(connector),
                  },
                  ...metadata?.attributes,
                },
                () => {
                  return inferenceAdapter
                    .chatComplete({
                      system: systemWithAnonymizationInstructions,
                      executor,
                      messages: anonymization.messages,
                      toolChoice,
                      tools,
                      temperature,
                      logger,
                      functionCalling,
                      modelName,
                      abortSignal,
                      metadata,
                      timeout,
                      stream,
                    })
                    .pipe(
                      chunksIntoMessage({
                        toolOptions: { toolChoice, tools },
                        logger,
                      })
                    );
                }
              ).pipe(deanonymizeMessage({ ...anonymization, replacementsId }));
            })
          );
        })
      )
      .pipe(
        retryWithExponentialBackoff({
          maxRetry: maxRetries,
          backoffMultiplier: retryConfiguration.backoffMultiplier,
          initialDelay: retryConfiguration.initialDelay,
          errorFilter: getRetryFilter(retryConfiguration.retryOn),
        }),
        callbackManager ? handleLifecycleCallbacks({ callbackManager }) : identity,
        abortSignal ? handleCancellation(abortSignal) : identity
      );

    if (stream) {
      return inference$.pipe(share());
    } else {
      return streamToResponse(inference$);
    }
  };
}
