/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInferenceRequestError,
  isConnectorApiCall,
  isInferenceIdApiCall,
  type ChatCompleteOptions,
  type ChatCompleteAPI,
} from '@kbn/inference-common';
import type { ChatCompleteApiWithCallback } from './callback_api';

export function createChatCompleteApi(opts: {
  callbackApi: ChatCompleteApiWithCallback;
}): ChatCompleteAPI;
export function createChatCompleteApi({
  callbackApi,
}: {
  callbackApi: ChatCompleteApiWithCallback;
}) {
  return (options: ChatCompleteOptions) => {
    const { stream, abortSignal, retryConfiguration, maxRetries, ...rest } = options;
    const initBase = { stream, abortSignal, retryConfiguration, maxRetries };

    const callback = (_context: unknown) => rest;

    if (isConnectorApiCall(options)) {
      return callbackApi({ ...initBase, connectorId: options.connectorId }, callback);
    }

    if (isInferenceIdApiCall(options)) {
      return callbackApi({ ...initBase, inferenceId: options.inferenceId }, callback);
    }

    throw createInferenceRequestError(
      'Either connectorId or inferenceId must be provided',
      400
    );
  };
}
