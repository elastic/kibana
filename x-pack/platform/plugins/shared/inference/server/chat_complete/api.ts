/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompleteOptions,
  ChatCompleteAPI,
  FeatureChatCompleteAPI,
  FeatureChatCompleteOptions,
} from '@kbn/inference-common';
import type { ChatCompleteApiWithCallback } from './callback_api';

const isFeatureChatCompleteOptions = (
  options: ChatCompleteOptions | FeatureChatCompleteOptions
): options is FeatureChatCompleteOptions =>
  'featureId' in options && options.featureId !== undefined;

export function createChatCompleteApi(opts: {
  callbackApi: ChatCompleteApiWithCallback;
}): ChatCompleteAPI & FeatureChatCompleteAPI;
export function createChatCompleteApi({
  callbackApi,
}: {
  callbackApi: ChatCompleteApiWithCallback;
}) {
  return (options: ChatCompleteOptions | FeatureChatCompleteOptions) => {
    if (isFeatureChatCompleteOptions(options)) {
      const { featureId, stream, abortSignal, retryConfiguration, maxRetries, ...rest } = options;

      const callback = (_context: unknown) => rest;

      return callbackApi(
        { featureId, stream, abortSignal, retryConfiguration, maxRetries },
        callback
      );
    }

    const { connectorId, stream, abortSignal, retryConfiguration, maxRetries, ...rest } = options;

    const callback = (_context: unknown) => rest;

    return callbackApi(
      { connectorId, stream, abortSignal, retryConfiguration, maxRetries },
      callback
    );
  };
}
