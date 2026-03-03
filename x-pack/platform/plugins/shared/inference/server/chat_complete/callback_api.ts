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
import { defer, forkJoin, from, identity, share, switchMap, catchError, throwError } from 'rxjs';
import { withChatCompleteSpan } from '@kbn/inference-tracing';
import type { ElasticsearchClient } from '@kbn/core/server';
import { omit } from 'lodash';
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
    const inference$ = defer(() => {
      return from(endpointIdCache.has(connectorId, esClient)).pipe(
        switchMap((isInferenceEndpoint) => {
          if (isInferenceEndpoint) {
            return createInferenceEndpointPipeline({
              inferenceId: connectorId,
              esClient,
              logger,
              anonymizationRulesPromise,
              regexWorker,
              callback,
              abortSignal,
              stream,
            }).pipe(
              catchError((endpointError) => {
                if (endpointError?.meta?.status === 404 || endpointError?.statusCode === 404) {
                  endpointIdCache.invalidate();
                }
                return throwError(() => endpointError);
              })
            );
          }

          return createConnectorPipeline({
            connectorId,
            request,
            actions,
            esClient,
            logger,
            anonymizationRulesPromise,
            regexWorker,
            callback,
            abortSignal,
            stream,
          }).pipe(
            catchError((connectorError) => {
              if (connectorError?.meta?.status === 404 || connectorError?.statusCode === 404) {
                return throwError(() =>
                  createInferenceRequestError(
                    `No connector or inference endpoint found for ID '${connectorId}'`,
                    404
                  )
                );
              }
              return throwError(() => connectorError);
            })
          );
        })
      );
    }).pipe(
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

function createConnectorPipeline({
  connectorId,
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
  return forkJoin({
    executor: from(getInferenceExecutor({ connectorId, request, actions })),
    anonymizationRules: from(anonymizationRulesPromise),
  }).pipe(
    switchMap(({ executor, anonymizationRules }) => {
      const connector = executor.getConnector();
      const connectorType = connector.type;

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
      } = callback({
        model: {
          family: getConnectorFamily(connector),
          provider: getConnectorProvider(connector),
          id: getConnectorDefaultModel(connector),
        },
      });

      const messages = sanitizeMessages(givenMessages);

      return from(
        anonymizeMessages({ system, messages, anonymizationRules, regexWorker, esClient })
      ).pipe(
        switchMap((anonymization) => {
          const inferenceAdapter = getInferenceAdapter(connectorType);

          if (!inferenceAdapter) {
            return throwError(() =>
              createInferenceRequestError(`Adapter for type ${connectorType} not implemented`, 400)
            );
          }

          const systemWithAnonymizationInstructions = anonymization.system
            ? addAnonymizationInstruction(anonymization.system, anonymizationRules)
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
                .pipe(chunksIntoMessage({ toolOptions: { toolChoice, tools }, logger }));
            }
          ).pipe(deanonymizeMessage(anonymization));
        })
      );
    })
  );
}

function createInferenceEndpointPipeline({
  inferenceId,
  esClient,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  callback,
  abortSignal,
  stream,
}: {
  inferenceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  callback: ChatCompleteApiWithCallbackCallback;
  abortSignal?: AbortSignal;
  stream?: boolean;
}) {
  return forkJoin({
    endpointMeta: from(resolveInferenceEndpoint({ inferenceId, esClient, logger })),
    anonymizationRules: from(anonymizationRulesPromise),
  }).pipe(
    switchMap(({ endpointMeta, anonymizationRules }) => {
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
      } = callback({
        model: endpointMeta.modelId ? { id: endpointMeta.modelId } : undefined,
      });

      const messages = sanitizeMessages(givenMessages);

      const executor = createInferenceEndpointExecutor({ inferenceId, esClient });

      return from(
        anonymizeMessages({ system, messages, anonymizationRules, regexWorker, esClient })
      ).pipe(
        switchMap((anonymization) => {
          const systemWithAnonymizationInstructions = anonymization.system
            ? addAnonymizationInstruction(anonymization.system, anonymizationRules)
            : system;

          return withChatCompleteSpan(
            {
              system: systemWithAnonymizationInstructions,
              messages: anonymization.messages,
              tools,
              toolChoice,
              ...(endpointMeta.provider
                ? {
                    model: {
                      id: modelName ?? endpointMeta.modelId,
                      provider: endpointMeta.provider,
                    } as Parameters<typeof withChatCompleteSpan>[0]['model'],
                  }
                : {}),
              ...metadata?.attributes,
            },
            () => {
              return inferenceEndpointAdapter
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
                .pipe(chunksIntoMessage({ toolOptions: { toolChoice, tools }, logger }));
            }
          ).pipe(deanonymizeMessage(anonymization));
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
