/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundStep,
  RoundInput,
  RoundModelUsageStats,
} from '@kbn/agent-builder-common';
import { isToolCallStep, isAskUserQuestionStep } from '@kbn/agent-builder-common';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents/prompts';
import { mergeAttachmentRefs } from './migrate_attachments';

/** Merges execution fields while preserving round identity; callers must restore terminal state. */
export const mergeRounds = (
  previous: ConversationRound,
  next: ConversationRound
): ConversationRound => {
  let traceId: string[] | undefined;
  if (previous.trace_id || next.trace_id) {
    traceId = [
      ...(previous.trace_id
        ? Array.isArray(previous.trace_id)
          ? previous.trace_id
          : [previous.trace_id]
        : []),
      ...(next.trace_id ? (Array.isArray(next.trace_id) ? next.trace_id : [next.trace_id]) : []),
    ];
  }

  const mergedRound: ConversationRound = {
    id: previous.id,
    status: next.status,
    pending_prompts: next.pending_prompts,
    state: undefined,
    input: mergeRoundInput(previous.input, next.input),
    steps: [...previous.steps, ...next.steps],
    trace_id: traceId,
    started_at: previous.started_at,
    time_to_first_token: previous.time_to_first_token + next.time_to_first_token,
    time_to_last_token: previous.time_to_last_token + next.time_to_last_token,
    model_usage: mergeModelUsage(previous.model_usage, next.model_usage),
    response: next.response,
    origin: previous.origin,
    author: previous.author,
    configuration_overrides: next.configuration_overrides ?? previous.configuration_overrides,
  };

  return mergedRound;
};

const mergeRoundInput = (previous: RoundInput, next: RoundInput): RoundInput => {
  const mergedRefs = mergeAttachmentRefs(previous.attachment_refs, next.attachment_refs);
  return {
    ...previous,
    ...next,
    message: next.message || previous.message,
    ...(mergedRefs ? { attachment_refs: mergedRefs } : {}),
  };
};

export const mergeModelUsage = (
  a: RoundModelUsageStats,
  b: RoundModelUsageStats
): RoundModelUsageStats => {
  return {
    connector_id: a.connector_id,
    llm_calls: a.llm_calls + b.llm_calls,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    ...(a.cached_input_tokens !== undefined || b.cached_input_tokens !== undefined
      ? { cached_input_tokens: (a.cached_input_tokens ?? 0) + (b.cached_input_tokens ?? 0) }
      : {}),
    model: a.model ?? b.model,
  };
};

/**
 * Resolves pending steps and merges executions, keeping runtime and timeline reconstruction identical.
 */
export const applyResumeResolution = (
  previous: ConversationRound,
  next: ConversationRound,
  answers: Map<string, AskUserQuestionAnswer[]>
): ConversationRound => {
  // Tool calls made in the paused round that never resolved (awaiting the human).
  const pendingToolCallIds = new Set(
    previous.steps
      .filter(isToolCallStep)
      .filter((step) => step.results.length === 0)
      .map((step) => step.tool_call_id)
  );

  // The follow-up execution re-runs those calls; index its resolved copies by tool_call_id.
  const resolvedByToolCallId = new Map(
    next.steps
      .filter(isToolCallStep)
      .filter((step) => pendingToolCallIds.has(step.tool_call_id))
      .map((step) => [step.tool_call_id, step] as const)
  );

  const filledSteps: ConversationRoundStep[] = previous.steps.map((step) => {
    if (isToolCallStep(step) && step.results.length === 0) {
      const resolved = resolvedByToolCallId.get(step.tool_call_id);
      if (resolved) {
        return {
          ...step,
          results: resolved.results,
          ...(resolved.progression !== undefined
            ? { progression: [...(step.progression ?? []), ...resolved.progression] }
            : {}),
        };
      }
    }
    if (isAskUserQuestionStep(step) && step.answers === undefined) {
      const stepAnswers = answers.get(step.prompt_id);
      if (stepAnswers) {
        return { ...step, answers: stepAnswers };
      }
    }
    return step;
  });

  // The resolved calls now live in the paused round's positions; drop them from the follow-up.
  const nextSteps = next.steps.filter(
    (step) => !(isToolCallStep(step) && pendingToolCallIds.has(step.tool_call_id))
  );

  return mergeRounds({ ...previous, steps: filledSteps }, { ...next, steps: nextSteps });
};
