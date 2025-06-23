/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundPromptAPI,
  BoundPromptOptions,
  PromptAPI,
  PromptOptions,
  UnboundPromptOptions,
} from '@kbn/inference-common';

/**
 * Bind prompt to the provided parameters,
 * returning a bound version of the API.
 */
export function bindPrompt(prompt: PromptAPI, boundParams: BoundPromptOptions): BoundPromptAPI;
export function bindPrompt(prompt: PromptAPI, boundParams: BoundPromptOptions) {
  const { connectorId, functionCalling } = boundParams;
  return (unboundParams: UnboundPromptOptions) => {
    const params: PromptOptions = {
      ...unboundParams,
      connectorId,
      functionCalling,
    };
    return prompt(params);
  };
}
