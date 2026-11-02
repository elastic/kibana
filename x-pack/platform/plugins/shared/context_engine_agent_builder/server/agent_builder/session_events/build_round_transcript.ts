/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';

/** Tool results can be megabytes (file reads, command output); the transcript keeps a bounded excerpt. */
export const MAX_TOOL_RESULT_CHARS = 4_000;

const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}… [truncated ${text.length - max} characters]` : text;

const formatToolCall = (step: ToolCallStep): string[] => {
  const lines = [`[tool ${step.tool_id}] ${JSON.stringify(step.params ?? {})}`];
  for (const result of step.results ?? []) {
    lines.push(
      `[result ${step.tool_id}] ${truncate(
        JSON.stringify(result.data ?? null),
        MAX_TOOL_RESULT_CHARS
      )}`
    );
  }
  return lines;
};

/**
 * Renders a completed round as a plain-text transcript: the user's message, each tool call with
 * its bounded result, and the agent's response. Events hold this as-is; no inference runs on it.
 */
export const buildRoundTranscript = (round: ConversationRound): string => {
  const lines = [`user: ${round.input.message ?? ''}`];
  for (const step of round.steps.filter(isToolCallStep)) {
    lines.push(...formatToolCall(step));
  }
  lines.push(`agent: ${round.response.message ?? ''}`);
  return lines.join('\n');
};
