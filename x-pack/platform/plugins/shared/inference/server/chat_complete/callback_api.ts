/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteOptions, AnonymizationRule, Model } from '@kbn/inference-common';
import {
  createInferenceRequestError,
  getConnectorFamily,
  getConnectorProvider,
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
import { prepareAnonymization } from './prepare_anonymization';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  namespace: string;
  actions: ActionsPluginStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  anonymization?: InferenceAnonymizationOptions;
  endpointIdCache: InferenceEndpointIdCache;
  callbackManager?: InferenceCallbackManager;
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
}: {
  resolve: () => Promise<ResolvedPipelineContext>;
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  callback: ChatCompleteApiWithCallbackCallback;
  abortSignal?: AbortSignal;
  stream?: boolean;
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
        anonymizeMessages({ system, messages, anonymizationRules, regexWorker, esClient })
      ).pipe(
        switchMap((anonymization) => {
          const systemWithAnonymizationInstructions = anonymization.system
            ? addAnonymizationInstruction(anonymization.system, anonymizationRules)
            : system;

          const spanModel = getSpanModel(modelName);

          return withChatCompleteSpan(
            {
              system: systemWithAnonymizationInstructions,
              messages: anonymization.messages,
              tools,
              toolChoice,
              ...(spanModel ? { model: spanModel } : {}),
              ...metadata?.attributes,
            },
            () => {
              return chatComplete({
                system: systemWithAnonymizationInstructions,
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
              }).pipe(chunksIntoMessage({ toolOptions: { toolChoice, tools }, logger }));
            }
          ).pipe(deanonymizeMessage(anonymization));
        })
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
}: {
  connectorId: string;
  endpointIdCache: InferenceEndpointIdCache;
  request: KibanaRequest;
  actions: ActionsPluginStart;
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  callback: ChatCompleteApiWithCallbackCallback;
  abortSignal?: AbortSignal;
  stream?: boolean;
}) {
  return from(endpointIdCache.has(connectorId, esClient)).pipe(
    switchMap((isInferenceEndpoint) => {
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
            });
            const connector = executor.getConnector();
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
      }).pipe(
        catchError((error) => {
          if (error?.meta?.status === 404 || error?.statusCode === 404) {
            if (isInferenceEndpoint) {
              endpointIdCache.invalidate();
              return throwError(() => error);
            }
            return throwError(() =>
              createInferenceRequestError(
                `No connector or inference endpoint found for ID '${connectorId}'`,
                404
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
