/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  isDeliveredMessageStep,
  isInterimAnswerStep,
  isReasoningStep,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type { SessionEventInput } from '@kbn/context-engine-plugin/server';

type ToolSessionEvent = Extract<SessionEventInput, { type: 'tool' }>;

const toJson = (value: unknown): ToolSessionEvent['result'] => JSON.parse(JSON.stringify(value));

const toolStatus = ({ interrupted, results }: ToolCallStep): ToolSessionEvent['status'] => {
  if (interrupted) {
    return null;
  }
  return results.some(({ type }) => type === ToolResultType.error) ? 'failed' : 'successful';
};

/**
 * Maps a round to Context Engine session events, in the order the round produced them.
 * Event types: `user`, `assistant`, `reasoning`, `tool` and `meta` (not emitted here).
 */
export const roundToSessionEvents = (round: ConversationRound): SessionEventInput[] => {
  const base = { turn_id: round.id, event_at: round.started_at };
  const events: SessionEventInput[] = [];

  if (round.input.message) {
    events.push({ ...base, id: `${round.id}:user`, type: 'user', content: round.input.message });
  }

  round.steps.forEach((step, index) => {
    if (isReasoningStep(step) && !step.transient && step.reasoning) {
      events.push({
        ...base,
        id: `${round.id}:reasoning:${index}`,
        type: 'reasoning',
        content: step.reasoning,
      });
      return;
    }
    if (isToolCallStep(step)) {
      const { tool_call_id: toolCallId, tool_id: toolId, params, results } = step;
      events.push({
        ...base,
        id: `${round.id}:tool_call:${toolCallId}`,
        type: 'assistant',
        tool_calls: [{ id: toolCallId, name: toolId, args: toJson(params) }],
      });
      events.push({
        ...base,
        id: `${round.id}:tool:${toolCallId}`,
        type: 'tool',
        tool_call_id: toolCallId,
        tool_name: toolId,
        result: toJson(results),
        status: toolStatus(step),
      });
      return;
    }
    if (isInterimAnswerStep(step)) {
      events.push({
        ...base,
        id: `${round.id}:interim:${index}`,
        type: 'assistant',
        content: step.message,
      });
      return;
    }
    if (isDeliveredMessageStep(step)) {
      events.push({
        ...base,
        id: `${round.id}:delivered:${step.event_id}`,
        type: 'user',
        content: step.message,
        event_at: step.delivered_at,
      });
    }
  });

  if (round.response.message) {
    events.push({
      ...base,
      id: `${round.id}:answer`,
      type: 'assistant',
      content: round.response.message,
    });
  }

  return events.map((event, seq) => ({ ...event, seq }));
};
