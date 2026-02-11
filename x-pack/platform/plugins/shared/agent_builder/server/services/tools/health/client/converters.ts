/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHealthDocument, ToolHealthState } from './types';

/**
 * Converts an Elasticsearch document to an application-level ToolHealthState.
 */
export const fromEs = (doc: ToolHealthDocument): ToolHealthState => {
  const source = doc._source!;
  return {
    toolId: source.tool_id,
    status: source.status,
    lastCheck: source.last_check,
    errorMessage: source.error_message || undefined,
    consecutiveFailures: source.consecutive_failures,
  };
};
