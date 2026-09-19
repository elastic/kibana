/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStepType,
  type ConversationRoundStep,
  type TodosStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { applyStepUpdates, countNonTodosSteps, persistableSteps, stepUpdates } from './step_state';

const toolCall = (id: string, groupId = 'g1'): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my_tool',
  params: { q: id },
  results: [],
  progression: [],
  tool_call_group_id: groupId,
});

const reasoning = (text: string): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});

const todos = (n: number): TodosStep => ({
  type: ConversationRoundStepType.updateTodos,
  todos: [{ id: `t${n}`, content: `todo ${n}`, status: 'pending' }],
});

const invalidStateError = expect.objectContaining({
  meta: expect.objectContaining({ errCode: AgentExecutionErrorCode.invalidState }),
});

describe('applyStepUpdates', () => {
  it('appends steps in order', () => {
    const result = applyStepUpdates(
      [],
      [stepUpdates.append(reasoning('a')), stepUpdates.appendToolCall(toolCall('c1'))]
    );
    expect(result.map((s) => s.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
    ]);
  });

  it('does not mutate the input array', () => {
    const input: ConversationRoundStep[] = [reasoning('a')];
    applyStepUpdates(input, [stepUpdates.append(reasoning('b'))]);
    expect(input).toHaveLength(1);
  });

  it('throws invalidState on duplicate tool_call_id', () => {
    expect(() =>
      applyStepUpdates([toolCall('c1')], [stepUpdates.appendToolCall(toolCall('c1'))])
    ).toThrow(invalidStateError);
  });

  it('resolves a tool call in place and concatenates progression', () => {
    const seeded = { ...toolCall('c1'), progression: [{ message: 'before' }] };
    const result = applyStepUpdates(
      [reasoning('a'), seeded, reasoning('b')],
      [
        stepUpdates.resolveToolCall({
          toolCallId: 'c1',
          toolId: 'my_tool',
          results: [{ type: 'other', data: { ok: true } }],
          progression: [{ message: 'after' }],
        }),
      ]
    );
    expect(result).toHaveLength(3);
    const resolved = result[1] as ToolCallStep;
    expect(resolved.results).toEqual([{ type: 'other', data: { ok: true } }]);
    expect(resolved.progression).toEqual([{ message: 'before' }, { message: 'after' }]);
    // the seeded step object is not mutated
    expect(seeded.results).toEqual([]);
  });

  it('keeps a tool call resolved with an empty results array', () => {
    const result = applyStepUpdates(
      [toolCall('c1')],
      [
        stepUpdates.resolveToolCall({
          toolCallId: 'c1',
          toolId: 'my_tool',
          results: [],
          progression: [],
        }),
      ]
    );
    expect((result[0] as ToolCallStep).results).toEqual([]);
  });

  it('throws invalidState when resolving an unknown tool call', () => {
    expect(() =>
      applyStepUpdates(
        [],
        [
          stepUpdates.resolveToolCall({
            toolCallId: 'nope',
            toolId: 'x',
            results: [],
            progression: [],
          }),
        ]
      )
    ).toThrow(invalidStateError);
  });

  it('upserts ask_user_question steps by prompt_id', () => {
    const question = {
      type: ConversationRoundStepType.askUserQuestion as const,
      prompt_id: 'p1',
      questions: [{ question: 'Which?', options: [{ label: 'a' }], multi_select: false }],
    };
    const first = applyStepUpdates([], [stepUpdates.upsertQuestion(question)]);
    const second = applyStepUpdates(first, [
      stepUpdates.upsertQuestion({ ...question, answers: [{ choice: [0] }] }),
    ]);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ prompt_id: 'p1', answers: [{ choice: [0] }] });
  });

  it('keeps the todos step as a trailing singleton', () => {
    const result = applyStepUpdates(
      [reasoning('a'), todos(1)],
      [
        stepUpdates.append(reasoning('b')),
        stepUpdates.setTodos(todos(2)),
        stepUpdates.appendToolCall(toolCall('c1')),
      ]
    );
    expect(result.map((s) => s.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.updateTodos,
    ]);
    expect(result.at(-1)).toMatchObject({ todos: [{ id: 't2' }] });
  });

  it('keeps the last todos step when the input carries several (legacy merged rounds)', () => {
    const result = applyStepUpdates(
      [todos(1), reasoning('r'), todos(2)],
      [stepUpdates.append(reasoning('s'))]
    );
    expect(result).toEqual([reasoning('r'), reasoning('s'), todos(2)]);
  });
});

describe('countNonTodosSteps', () => {
  it('ignores the todos step', () => {
    expect(countNonTodosSteps([reasoning('a'), todos(1), toolCall('c1')])).toBe(2);
  });
});

describe('persistableSteps', () => {
  it('drops browser and dedicated-lifecycle tool call steps, keeps unknown ones', () => {
    const steps = [toolCall('server'), toolCall('browser'), toolCall('ask'), toolCall('unknown')];
    const result = persistableSteps(steps, {
      server: { toolName: 'my_tool', kind: 'server' },
      browser: { toolName: 'browser_x', kind: 'browser' },
      ask: { toolName: 'platform_core_ask_user_question', kind: 'dedicated' },
    });
    expect(result.map((s) => (s as ToolCallStep).tool_call_id)).toEqual(['server', 'unknown']);
  });
});
