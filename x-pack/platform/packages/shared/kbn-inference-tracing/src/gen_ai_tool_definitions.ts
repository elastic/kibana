/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinition } from '@kbn/inference-common';

export interface GenAiToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters?: ToolDefinition['schema'];
}

/** Converts inference tools to the OpenTelemetry GenAI tool-definition schema. */
export const getGenAiToolDefinitions = (
  tools: Record<string, ToolDefinition>
): GenAiToolDefinition[] =>
  Object.entries(tools).map(([name, { description, schema }]) => ({
    type: 'function',
    name,
    description,
    parameters: schema,
  }));
