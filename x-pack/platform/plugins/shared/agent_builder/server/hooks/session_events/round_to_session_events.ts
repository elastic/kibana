/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound, ToolCallStep } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  isAskUserQuestionStep,
  isDeliveredMessageStep,
  isInterimAnswerStep,
  isReasoningStep,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type { SessionEventInput } from '@kbn/context-engine-plugin/server';
import { materializeAskUserQuestionToolCall } from '../../services/execution/run_agent/utils/ask_user_question_tool_call';

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

  const pushToolCall = ({
    toolCallId,
    toolName,
    args,
    result,
    status,
  }: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result: unknown;
    status: ToolSessionEvent['status'];
  }) => {
    events.push({
      ...base,
      id: `${round.id}:tool_call:${toolCallId}`,
      type: 'assistant',
      tool_calls: [{ id: toolCallId, name: toolName, args: toJson(args) }],
    });
    events.push({
      ...base,
      id: `${round.id}:tool:${toolCallId}`,
      type: 'tool',
      tool_call_id: toolCallId,
      tool_name: toolName,
      result: toJson(result),
      status,
    });
  };

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
      pushToolCall({
        toolCallId: step.tool_call_id,
        toolName: step.tool_id,
        args: step.params,
        result: step.results,
        status: toolStatus(step),
      });
      return;
    }
    if (isAskUserQuestionStep(step) && step.answers !== undefined) {
      const { toolCallId, toolName, args, content } = materializeAskUserQuestionToolCall({
        promptId: step.prompt_id,
        questions: step.questions,
        answers: step.answers,
      });
      pushToolCall({
        toolCallId,
        toolName,
        args,
        result: JSON.parse(content),
        status: 'successful',
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
