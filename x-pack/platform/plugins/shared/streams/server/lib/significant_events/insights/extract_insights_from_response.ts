/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Insight } from '@kbn/streams-schema';
import { SUBMIT_INSIGHTS_TOOL_NAME, parseInsightsWithErrors } from './schema';

/**
 * Safely extracts insights from an LLM response.
 */
export function extractInsightsFromResponse(
  response: { toolCalls?: Array<{ function: { name: string; arguments: unknown } }> },
  logger: Logger
): Insight[] {
  if (!response.toolCalls || response.toolCalls.length === 0) {
    logger.warn('LLM response has no tool calls');
    return [];
  }

  const toolCall = response.toolCalls.find((tc) => tc.function?.name === SUBMIT_INSIGHTS_TOOL_NAME);

  if (!toolCall || !toolCall.function?.arguments) {
    logger.warn(`${SUBMIT_INSIGHTS_TOOL_NAME} tool call missing arguments`);
    return [];
  }

  const { insights, errors: validationErrors } = parseInsightsWithErrors(
    toolCall.function.arguments
  );

  if (validationErrors) {
    logger.warn(`Insights validation failed: ${validationErrors.message}`);
  }

  return insights;
}
