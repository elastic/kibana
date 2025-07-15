/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteAPI, BoundChatCompleteAPI } from '@kbn/inference-common';
import { BoundOptions, bindApi } from '@kbn/inference-common';

/**
 * Bind chatComplete to the provided parameters,
 * returning a bound version of the API.
 */
export function bindChatComplete(
  chatComplete: ChatCompleteAPI,
  boundParams: BoundOptions
): BoundChatCompleteAPI;

export function bindChatComplete(chatComplete: ChatCompleteAPI, boundParams: BoundOptions) {
  return bindApi(chatComplete, boundParams);
}
