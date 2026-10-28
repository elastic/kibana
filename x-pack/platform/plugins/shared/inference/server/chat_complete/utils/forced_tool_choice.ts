/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolChoice } from '@kbn/inference-common';
import { ToolChoiceType } from '@kbn/inference-common';
import { getClaudeModelKey, isClaudeModelId } from './claude_model_key';

// Claude models known to accept `tool_choice: any` or a named tool. Newer Claude models
// (Sonnet 5.5, Opus 5.5, Fable 5.1, ...) reject both with a 400, so any Claude model not listed
// here is sent `auto` instead. Remove once Elasticsearch exposes tool-choice capabilities.
const CLAUDE_MODEL_KEYS_WITH_FORCED_TOOL_CHOICE = new Set([
  'haiku-3',
  'haiku-3-5',
  'sonnet-3-5',
  'sonnet-3-7',
  'opus-3',
  'sonnet-4',
  'opus-4',
  'opus-4-1',
  'haiku-4-5',
  'sonnet-4-5',
  'opus-4-5',
  'sonnet-4-6',
  'opus-4-6',
  'opus-4-7',
  'opus-4-8',
  'sonnet-5',
  'opus-5',
  'fable-5',
]);

export const supportsForcedToolChoice = (modelId?: string): boolean => {
  if (!modelId || !isClaudeModelId(modelId)) {
    return true;
  }
  const modelKey = getClaudeModelKey(modelId);
  return modelKey !== undefined && CLAUDE_MODEL_KEYS_WITH_FORCED_TOOL_CHOICE.has(modelKey);
};

const isForcedToolChoice = (toolChoice: ToolChoice | undefined): boolean =>
  toolChoice === ToolChoiceType.required ||
  (typeof toolChoice === 'object' && toolChoice !== null && 'function' in toolChoice);

/**
 * Downgrades a forced tool choice to `auto` for models that reject forced tool use.
 * The prompt is left unchanged; callers already instruct the model which tool to call.
 */
export const resolveToolChoice = ({
  toolChoice,
  modelId,
  logger,
}: {
  toolChoice: ToolChoice | undefined;
  modelId?: string;
  logger?: Logger;
}): ToolChoice | undefined => {
  if (!isForcedToolChoice(toolChoice) || supportsForcedToolChoice(modelId)) {
    return toolChoice;
  }
  logger?.debug(
    `Model "${modelId}" does not support forced tool choice, sending "auto" instead of ${JSON.stringify(
      toolChoice
    )}`
  );
  return ToolChoiceType.auto;
};
