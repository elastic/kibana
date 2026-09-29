/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AskUserQuestionStep,
  ConversationRoundStep,
  TodosStep,
  ToolCallProgress,
  ToolCallStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import { isAskUserQuestionStep, isTodosStep, isToolCallStep } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { ToolRenderStateMap } from './transient_state';

export type AppendableStep = Exclude<
  ConversationRoundStep,
  ToolCallStep | TodosStep | AskUserQuestionStep
>;

export interface ResolveToolCallParams {
  toolCallId: string;
  /** Redundant with the step; carried so event conversion can emit `tool_result` without a lookup. */
  toolId: string;
  results: ToolResult[];
  /** Progression observed *during this execution* only; the reducer appends it to what the step already has. */
  progression: ToolCallProgress[];
}

export type RunStepUpdate =
  | { type: 'append'; step: AppendableStep }
  | { type: 'append_tool_call'; step: ToolCallStep }
  | ({ type: 'resolve_tool_call' } & ResolveToolCallParams)
  | { type: 'upsert_question'; step: AskUserQuestionStep }
  | { type: 'set_todos'; step: TodosStep };

export const stepUpdates = {
  append: (step: AppendableStep): RunStepUpdate => ({ type: 'append', step }),
  appendToolCall: (step: ToolCallStep): RunStepUpdate => ({ type: 'append_tool_call', step }),
  resolveToolCall: (params: ResolveToolCallParams): RunStepUpdate => ({
    type: 'resolve_tool_call',
    ...params,
  }),
  upsertQuestion: (step: AskUserQuestionStep): RunStepUpdate => ({
    type: 'upsert_question',
    step,
  }),
  setTodos: (step: TodosStep): RunStepUpdate => ({ type: 'set_todos', step }),
};

const invalidState = (message: string) =>
  createAgentExecutionError(message, AgentExecutionErrorCode.invalidState, {});

const findToolCallIndex = (steps: ConversationRoundStep[], toolCallId: string): number =>
  steps.findIndex((step) => isToolCallStep(step) && step.tool_call_id === toolCallId);

/**
 * The `steps` channel reducer. Keeps the todos step as a trailing singleton (last one wins if the
 * input has several); everything else is inserted before it. Pure: never mutates `steps` or the
 * step objects it receives.
 */
export const applyStepUpdates = (
  steps: ConversationRoundStep[],
  updates: RunStepUpdate[]
): ConversationRoundStep[] => {
  let body = steps.filter((step) => !isTodosStep(step));
  // Well-formed input has at most one todos step. Legacy merged rounds (one todos step per
  // execution, concatenated by `mergeRounds`) can carry several: the last one is the latest.
  let todos = steps.filter(isTodosStep).at(-1);

  for (const update of updates) {
    switch (update.type) {
      case 'append':
        body = [...body, update.step];
        break;
      case 'append_tool_call': {
        const { tool_call_id: toolCallId } = update.step;
        if (findToolCallIndex(body, toolCallId) >= 0) {
          throw invalidState(`[steps] duplicate tool_call_id "${toolCallId}"`);
        }
        body = [...body, update.step];
        break;
      }
      case 'resolve_tool_call': {
        const index = findToolCallIndex(body, update.toolCallId);
        if (index < 0) {
          throw invalidState(`[steps] cannot resolve unknown tool_call_id "${update.toolCallId}"`);
        }
        const current = body[index] as ToolCallStep;
        const resolved: ToolCallStep = {
          ...current,
          results: update.results,
          progression: [...(current.progression ?? []), ...update.progression],
        };
        body = [...body.slice(0, index), resolved, ...body.slice(index + 1)];
        break;
      }
      case 'upsert_question': {
        const index = body.findIndex(
          (step) => isAskUserQuestionStep(step) && step.prompt_id === update.step.prompt_id
        );
        body =
          index < 0
            ? [...body, update.step]
            : [...body.slice(0, index), update.step, ...body.slice(index + 1)];
        break;
      }
      case 'set_todos':
        todos = update.step;
        break;
    }
  }

  return todos ? [...body, todos] : body;
};

export const countNonTodosSteps = (steps: ConversationRoundStep[]): number =>
  steps.filter((step) => !isTodosStep(step)).length;

/**
 * Browser and dedicated-lifecycle tool calls are runtime-only and never persisted. Calls with no
 * render state (pre-resume steps) are always kept: they were persisted before, so they are durable.
 */
export const persistableSteps = (
  steps: ConversationRoundStep[],
  renderState: ToolRenderStateMap
): ConversationRoundStep[] =>
  steps.filter((step) => {
    if (!isToolCallStep(step)) return true;
    const kind = renderState[step.tool_call_id]?.kind;
    return kind === undefined || kind === 'server';
  });
