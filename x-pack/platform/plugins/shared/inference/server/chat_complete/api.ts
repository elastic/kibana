/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompleteOptions, type ChatCompleteAPI } from '@kbn/inference-common';
import { createChatCompleteCallbackApi } from './callback_api';
import { CreateChatCompleteApiOptions } from './types';

export function createChatCompleteApi(options: CreateChatCompleteApiOptions): ChatCompleteAPI;
export function createChatCompleteApi({
  request,
  actions,
  logger,
  anonymizationRulesPromise,
  regexWorker,
  esClient,
}: CreateChatCompleteApiOptions) {
  const callbackApi = createChatCompleteCallbackApi({
    request,
    actions,
    logger,
    anonymizationRulesPromise,
    regexWorker,
    esClient,
  });

  return (options: ChatCompleteOptions) => {
    const { connectorId, stream, abortSignal, retryConfiguration, maxRetries, ...rest } = options;
    return callbackApi(
      {
        connectorId,
        stream,
        abortSignal,
        retryConfiguration,
        maxRetries,
      },
      () => {
        return rest;
      }
    );
  };
}
