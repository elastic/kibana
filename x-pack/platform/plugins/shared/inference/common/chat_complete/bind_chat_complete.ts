/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompleteAPI,
  ChatCompleteOptions,
  BoundChatCompleteAPI,
  BoundChatCompleteOptions,
  UnboundChatCompleteOptions,
  ToolOptions,
} from '@kbn/inference-common';

/**
 * Bind chatComplete to the provided parameters,
 * returning a bound version of the API.
 */
export function bindChatComplete(
  chatComplete: ChatCompleteAPI,
  boundParams: BoundChatCompleteOptions
): BoundChatCompleteAPI;
export function bindChatComplete(
  chatComplete: ChatCompleteAPI,
  boundParams: BoundChatCompleteOptions
) {
  const { connectorId, functionCalling } = boundParams;
  return (unboundParams: UnboundChatCompleteOptions<ToolOptions, boolean>) => {
    const params: ChatCompleteOptions<ToolOptions, boolean> = {
      ...unboundParams,
      connectorId,
      functionCalling,
    };
    return chatComplete(params);
  };
}
