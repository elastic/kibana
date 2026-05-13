/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context } from '@opentelemetry/api';

const contextsByExecutionId = new Map<string, Context>();

export const setExecutionOtelContext = (executionId: string, ctx: Context): void => {
  contextsByExecutionId.set(executionId, ctx);
};

export const getExecutionOtelContext = (executionId: string): Context | undefined => {
  return contextsByExecutionId.get(executionId);
};

export const clearExecutionOtelContext = (executionId: string): void => {
  contextsByExecutionId.delete(executionId);
};
