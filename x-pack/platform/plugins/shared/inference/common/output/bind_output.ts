/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OutputAPI,
  OutputOptions,
  BoundOutputAPI,
  BoundOutputOptions,
  UnboundOutputOptions,
  ToolSchema,
} from '@kbn/inference-common';

/**
 * Bind output to the provided parameters,
 * returning a bound version of the API.
 */
export function bindOutput(
  chatComplete: OutputAPI,
  boundParams: BoundOutputOptions
): BoundOutputAPI;
export function bindOutput(chatComplete: OutputAPI, boundParams: BoundOutputOptions) {
  const { connectorId, functionCalling } = boundParams;
  return (unboundParams: UnboundOutputOptions<string, ToolSchema, boolean>) => {
    const params: OutputOptions<string, ToolSchema, boolean> = {
      ...unboundParams,
      connectorId,
      functionCalling,
    };
    return chatComplete(params);
  };
}
