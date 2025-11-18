/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteOptions } from '@kbn/inference-common';
import { type ChatCompleteAPI } from '@kbn/inference-common';
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
