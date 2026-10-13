/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolChoice } from '../types';

/**
 * Whether the langchain `tool_choice` forces a tool call (`any` or a named tool).
 */
export const isForcedToolChoice = (toolChoice: ToolChoice | undefined): boolean =>
  toolChoice !== undefined && toolChoice !== 'auto' && toolChoice !== 'none';

/**
 * Detects the provider error returned when a model rejects a forced `tool_choice`, e.g.
 * `status [400] ... [tool_choice: type "tool" and "any" are not supported for this model.]`
 */
export const isUnsupportedToolChoiceError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /tool_choice/i.test(message) && /not supported|unsupported|not allowed/i.test(message);
};

export const getToolChoiceFallbackInstruction = (toolChoice: ToolChoice | undefined): string =>
  toolChoice && toolChoice !== 'any'
    ? `You MUST respond by calling the "${toolChoice}" tool. Do not reply with plain text.`
    : 'You MUST respond by calling one of the provided tools. Do not reply with plain text.';
