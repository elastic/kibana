/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import { isReasoningStep, isToolCallStep } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  JsonValue,
  SessionEventInput,
} from '@kbn/context-engine-plugin/server/session_events/types';

type UnorderedEvent = SessionEventInput extends infer Event
  ? Event extends SessionEventInput
    ? Omit<Event, 'seq'>
    : never
  : never;

// Tool params and results are plain JSON once serialized, which is what the event stores.
const toJson = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value ?? null));

const toolStatus = ({ interrupted, results }: ToolCallStep): 'successful' | 'failed' | null => {
  if (interrupted) {
    return null;
  }
  return results.some(({ type }) => type === ToolResultType.error) ? 'failed' : 'successful';
};

/**
 * Maps one Agent Builder round to session events: the user message, then each reasoning and tool
 * step in order (a tool call as an assistant event followed by its tool result), then the answer.
 * Event ids derive from the round, so a resent round produces the same ids and readers drop the
 * duplicates. Steps carry no time of their own, so every event takes the round's start, and
 * `seq` keeps the order.
 */
export const roundToSessionEvents = (round: ConversationRound): SessionEventInput[] => {
  const base = { turn_id: round.id, event_at: round.started_at };
  const events: UnorderedEvent[] = [];

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
    }
    if (isToolCallStep(step)) {
      const { tool_call_id: toolCallId, tool_id: toolId } = step;
      events.push({
        ...base,
        id: `${round.id}:tool_call:${toolCallId}`,
        type: 'assistant',
        tool_calls: [{ id: toolCallId, name: toolId, args: toJson(step.params) }],
      });
      events.push({
        ...base,
        id: `${round.id}:tool:${toolCallId}`,
        type: 'tool',
        tool_call_id: toolCallId,
        tool_name: toolId,
        result: toJson(step.results),
        status: toolStatus(step),
      });
    }
  });

  if (round.response?.message) {
    events.push({
      ...base,
      id: `${round.id}:answer`,
      type: 'assistant',
      content: round.response.message,
    });
  }

  return events.map((event, seq) => ({ ...event, seq }));
};
