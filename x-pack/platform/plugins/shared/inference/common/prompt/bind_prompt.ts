/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundPromptAPI, BoundOptions, PromptAPI } from '@kbn/inference-common';
import { bindApi } from '@kbn/inference-common';

/**
 * Bind prompt to the provided parameters,
 * returning a bound version of the API.
 */
export function bindPrompt(promptApi: PromptAPI, boundParams: BoundOptions): BoundPromptAPI;

export function bindPrompt(promptApi: PromptAPI, boundParams: BoundOptions) {
  return bindApi(promptApi, boundParams);
}
