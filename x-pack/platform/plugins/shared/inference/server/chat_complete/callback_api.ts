/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteOptions, AnonymizationRule, Model } from '@kbn/inference-common';
import {
  createInferenceRequestError,
  InferenceTaskErrorCode,
  getConnectorFamily,
  getConnectorProvider,
  getConnectorPlatform,
  getConnectorDefaultModel,
  type ChatCompleteCompositeResponse,
  MessageRole,
} from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { Observable } from 'rxjs';
import { defer, forkJoin, from, identity, share, switchMap, catchError, throwError } from 'rxjs';
import { withChatCompleteSpan } from '@kbn/inference-tracing';
import type { ElasticsearchClient } from '@kbn/core/server';
import { omit } from 'lodash';
import type { ActionsClientProvider } from '../types';
import type {
  InferenceAdapterChatCompleteOptions,
  InferenceConnectorAdapterChatCompleteEvent,
} from './types';
import { getInferenceAdapter } from './adapters';
import { inferenceEndpointAdapter } from './adapters/inference_endpoint';
import {
  chunksIntoMessage,
  getInferenceExecutor,
  createInferenceEndpointExecutor,
  resolveInferenceEndpoint,
  handleCancellation,
  handleLifecycleCallbacks,
  streamToResponse,
} from './utils';
import type { InferenceCallbackManager } from '../inference_client/callback_manager';
import { retryWithExponentialBackoff } from '../../common/utils/retry_with_exponential_backoff';
import { getRetryFilter } from '../../common/utils/error_retry_filter';
import { deanonymizeMessage } from './anonymization/deanonymize_message';
import { addAnonymizationInstruction } from './anonymization/add_anonymization_instruction';
import type { RegexWorkerService } from './anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from '../inference_client/anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import { prepareAnonymization } from './prepare_anonymization';
import type { TokenUsageLogger } from '../token_usage';
import { handleTokenUsageLogging, buildTokenUsageContext } from '../token_usage';

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  namespace: string;
  actions: ActionsClientProvider;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  anonymization?: InferenceAnonymizationOptions;
  endpointIdCache: InferenceEndpointIdCache;
  callbackManager?: InferenceCallbackManager;
  tokenUsageLogger?: TokenUsageLogger;
  isTokenUsageTrackingEnabled?: () => Promise<boolean>;
}

type CreateChatCompleteApiOptionsKey =
  | 'abortSignal'
  | 'stream'
  | 'retryConfiguration'
  | 'maxRetries';

type ChatCompleteApiWithCallbackInitOptions = Pick<
  ChatCompleteOptions,
  CreateChatCompleteApiOptionsKey
> & { connectorId: string };

export interface ChatCompleteCallbackContext {
  model?: Partial<Model>;
}

export type ChatCompleteApiWithCallbackCallback = (
  context: ChatCompleteCallbackContext
) => Omit<ChatCompleteOptions, CreateChatCompleteApiOptionsKey | 'connectorId'>;

export type ChatCompleteApiWithCallback = (
  options: ChatCompleteApiWithCallbackInitOptions,
  callback: ChatCompleteApiWithCallbackCallback
) => ChatCompleteCompositeResponse;

type ChatCompletePipelineAdapterOptions = Omit<InferenceAdapterChatCompleteOptions, 'executor'>;

type SpanModel = Parameters<typeof withChatCompleteSpan>[0]['model'];

interface ResolvedPipelineContext {
  callbackContext: ChatCompleteCallbackContext;
  getSpanModel: (modelName?: string) => SpanModel | undefined;
  chatComplete: (
    options: ChatCompletePipelineAdapterOptions
  ) => Observable<InferenceConnectorAdapterChatCompleteEvent>;
}

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
  anonymization,
  endpointIdCache,
  callbackManager,
  tokenUsageLogger,
  isTokenUsageTrackingEnabled,
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
      resolveAndCreatePipeline({
        connectorId,
        endpointIdCache,
        request,
        actions,
        esClient,
        logger,
        anonymizationRulesPromise,
        regexWorker,
        callback,
        abortSignal,
        stream,
        namespace,
        anonymization,
        tokenUsageLogger,
        isTokenUsageTrackingEnabled,
      })
    ).pipe(
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

function createChatCompletePipeline({
  resolve,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  callback,
  abortSignal,
  stream,
  namespace,
  anonymization,
  connectorId,
  tokenUsageLogger,
  isTokenUsageTrackingEnabled,
}: {
  resolve: () => Promise<ResolvedPipelineContext>;
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  callback: ChatCompleteApiWithCallbackCallback;
  abortSignal?: AbortSignal;
  stream?: boolean;
  namespace: string;
  anonymization?: InferenceAnonymizationOptions;
  connectorId: string;
  tokenUsageLogger?: TokenUsageLogger;
  isTokenUsageTrackingEnabled?: () => Promise<boolean>;
}) {
  return forkJoin({
    context: from(resolve()),
    anonymizationRules: from(anonymizationRulesPromise),
  }).pipe(
    switchMap(({ context, anonymizationRules }) => {
      const { callbackContext, getSpanModel, chatComplete } = context;

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
      } = callback(callbackContext);

      const messages = sanitizeMessages(givenMessages);

      return from(
        prepareAnonymization({
          namespace,
          logger,
          anonymizationRules,
          regexWorker,
          esClient,
          replacementsEsClient: anonymization?.replacements?.esClient,
          replacementsEncryptionKeyPromise: anonymization?.replacements?.encryptionKeyPromise,
          usePersistentReplacements: anonymization?.replacements?.usePersistentReplacements,
          requireReplacementsEncryptionKey: anonymization?.replacements?.requireEncryptionKey,
          saltPromise: anonymization?.saltPromise,
          resolveEffectivePolicy: anonymization?.resolveEffectivePolicy,
          metadata,
          system,
          messages,
        })
      ).pipe(
        switchMap(({ anonymization: preparedAnonymization, replacementsId, effectivePolicy }) => {
          const systemWithAnonymizationInstructions = preparedAnonymization.system
            ? addAnonymizationInstruction(
                preparedAnonymization.system,
                anonymizationRules,
                effectivePolicy
              )
            : system;

          const spanModel = getSpanModel(modelName);

          return withChatCompleteSpan(
            {
              system: systemWithAnonymizationInstructions,
              messages: preparedAnonymization.messages,
              tools,
              toolChoice,
              ...(spanModel ? { model: spanModel } : {}),
              ...metadata?.attributes,
            },
            () => {
              return chatComplete({
                system: systemWithAnonymizationInstructions,
                messages: preparedAnonymization.messages,
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
              }).pipe(chunksIntoMessage({ toolOptions: { toolChoice, tools }, logger }));
            }
          ).pipe(deanonymizeMessage({ ...preparedAnonymization, replacementsId }));
        }),
        tokenUsageLogger
          ? handleTokenUsageLogging({
              tokenUsageLogger,
              getContext: () =>
                buildTokenUsageContext({
                  connectorId,
                  model: callbackContext.model,
                  modelName,
                  featureId: metadata?.connectorTelemetry?.pluginId,
                  parentFeatureId: metadata?.connectorTelemetry?.aggregateBy,
                }),
              logger,
              isEnabled: isTokenUsageTrackingEnabled,
            })
          : identity
      );
    })
  );
}

function resolveAndCreatePipeline({
  connectorId,
  endpointIdCache,
  request,
  actions,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  callback,
  abortSignal,
  stream,
  namespace,
  anonymization,
  tokenUsageLogger,
  isTokenUsageTrackingEnabled,
}: {
  connectorId: string;
  endpointIdCache: InferenceEndpointIdCache;
  request: KibanaRequest;
  actions: ActionsClientProvider;
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  callback: ChatCompleteApiWithCallbackCallback;
  abortSignal?: AbortSignal;
  stream?: boolean;
  namespace: string;
  anonymization?: InferenceAnonymizationOptions;
  tokenUsageLogger?: TokenUsageLogger;
  isTokenUsageTrackingEnabled?: () => Promise<boolean>;
}) {
  return from(endpointIdCache.has(connectorId)).pipe(
    switchMap((isInferenceEndpoint) => {
      let resolvedAsInferenceEndpoint = isInferenceEndpoint;

      const resolve: () => Promise<ResolvedPipelineContext> = isInferenceEndpoint
        ? async () => {
            const endpointMeta = await resolveInferenceEndpoint({
              inferenceId: connectorId,
              esClient,
            });
            const executor = createInferenceEndpointExecutor({
              inferenceId: connectorId,
              esClient,
            });

            return {
              callbackContext: {
                model: endpointMeta.modelId ? { id: endpointMeta.modelId } : undefined,
              },
              getSpanModel: (modelName) =>
                endpointMeta.provider
                  ? ({
                      id: modelName ?? endpointMeta.modelId,
                      provider: endpointMeta.provider,
                    } as SpanModel)
                  : undefined,
              chatComplete: (options) =>
                inferenceEndpointAdapter.chatComplete({ ...options, executor }),
            };
          }
        : async () => {
            const executor = await getInferenceExecutor({
              connectorId,
              request,
              actions,
              esClient,
              logger,
            });
            const connector = executor.getConnector();

            if (connector.isInferenceEndpoint) {
              resolvedAsInferenceEndpoint = true;
              const inferenceId = connector.connectorId;
              const endpointMeta = await resolveInferenceEndpoint({
                inferenceId,
                esClient,
              });
              const endpointExecutor = createInferenceEndpointExecutor({
                inferenceId,
                esClient,
              });

              return {
                callbackContext: {
                  model: endpointMeta.modelId ? { id: endpointMeta.modelId } : undefined,
                },
                getSpanModel: (modelName) =>
                  endpointMeta.provider
                    ? ({
                        id: modelName ?? endpointMeta.modelId,
                        provider: endpointMeta.provider,
                      } as SpanModel)
                    : undefined,
                chatComplete: (options) =>
                  inferenceEndpointAdapter.chatComplete({ ...options, executor: endpointExecutor }),
              };
            }

            const connectorType = connector.type;
            const inferenceAdapter = getInferenceAdapter(connectorType);

            if (!inferenceAdapter) {
              throw createInferenceRequestError(
                `Adapter for type ${connectorType} not implemented`,
                400
              );
            }

            return {
              callbackContext: {
                model: {
                  family: getConnectorFamily(connector),
                  provider: getConnectorProvider(connector),
                  id: getConnectorDefaultModel(connector),
                  platform: getConnectorPlatform(connector),
                },
              },
              getSpanModel: (modelName) => ({
                id: modelName ?? getConnectorDefaultModel(connector),
                family: getConnectorFamily(connector),
                provider: getConnectorProvider(connector),
              }),
              chatComplete: (options) => inferenceAdapter.chatComplete({ ...options, executor }),
            };
          };

      return createChatCompletePipeline({
        resolve,
        esClient,
        logger,
        anonymizationRulesPromise,
        regexWorker,
        callback,
        abortSignal,
        stream,
        namespace,
        anonymization,
        connectorId,
        tokenUsageLogger,
        isTokenUsageTrackingEnabled,
      }).pipe(
        catchError((error) => {
          const is404 = error?.meta?.status === 404 || error?.statusCode === 404;
          const isUpstreamProviderError = error?.code === InferenceTaskErrorCode.providerError;
          if (is404 && !isUpstreamProviderError) {
            if (resolvedAsInferenceEndpoint) {
              endpointIdCache.invalidate();
              return throwError(() => error);
            }
            return throwError(() =>
              createInferenceRequestError(
                `No connector or inference endpoint found for ID '${connectorId}'`,
                400
              )
            );
          }
          return throwError(() => error);
        })
      );
    })
  );
}

function sanitizeMessages(messages: ChatCompleteOptions['messages']) {
  return messages.map((message) => {
    if (
      message.role === MessageRole.Assistant &&
      message.toolCalls !== undefined &&
      message.toolCalls.length === 0
    ) {
      return omit(message, 'toolCalls');
    }
    return message;
  });
}
