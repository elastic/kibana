/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteOptions, AnonymizationRule } from '@kbn/inference-common';
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

interface CreateChatCompleteApiOptions {
  request: KibanaRequest;
  actions: ActionsPluginStart;
  logger: Logger;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  callbackManager?: InferenceCallbackManager;
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
  actions,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  esClient,
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
            anonymizeMessages({
              system,
              messages,
              anonymizationRules,
              regexWorker,
              esClient,
            })
          ).pipe(
            switchMap((anonymization) => {
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
                    .pipe(
                      chunksIntoMessage({
                        toolOptions: { toolChoice, tools },
                        logger,
                      })
                    );
                }
              ).pipe(deanonymizeMessage(anonymization));
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
