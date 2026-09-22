/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStepType,
  ToolResultType,
  TODOS_UPDATED_UI_EVENT,
  type ChatAgentEvent,
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import { createRootStateChunkEvent } from '../../../../test_utils/graph_stream';
import { RunTracker, type RunSeed } from '../run_tracker';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';
import { buildInterruptedRound } from './round_summary';

jest.mock('../../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

const toolCall = (id: string, results: ToolCallStep['results'] = []): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: `tool-${id}`,
  params: { q: id },
  results,
  progression: [],
});

const reasoning = (text: string): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});

const result = (id: string) => ({
  tool_result_id: `res-${id}`,
  type: ToolResultType.other,
  data: { value: id },
});

const relevantSkills: ConversationRoundStep = {
  type: ConversationRoundStepType.relevantSkills,
  skills: [{ id: 's1', name: 'skill', path: '/s1', description: 'd' }],
  source: 'implicit',
};

const carriedTodos: ConversationRoundStep = {
  type: ConversationRoundStepType.updateTodos,
  todos: [{ content: 'x', status: 'pending' }],
  carried_over: true,
};

const modelProvider = (calls: unknown[] = []) =>
  ({ getUsageStats: () => ({ calls }) } as unknown as ModelProvider);

/** A tracker seeded as `run_chat_agent` does; `ran` feeds it the state the graph would have streamed. */
const trackerFor = (seed: RunSeed) => {
  const tracker = new RunTracker({ graphName: 'g' });
  tracker.seed(seed);
  return {
    tracker,
    ran: (updates: RunStepUpdate[]) =>
      tracker.observeGraphEvent(
        createRootStateChunkEvent('g', {
          steps: applyStepUpdates(seed.steps, updates),
          toolRenderState: seed.toolRenderState ?? {},
        })
      ),
  };
};
const freshTracker = (steps: ConversationRoundStep[] = []) => trackerFor({ steps });

describe('buildInterruptedRound', () => {
  const startTime = new Date('2026-01-01T00:00:00.000Z');
  const endTime = new Date('2026-01-01T00:00:02.500Z');

  it('builds the steps and the partial summary for a fresh round', () => {
    const { tracker, ran } = freshTracker([relevantSkills, carriedTodos]);
    ran([stepUpdates.appendToolCall(toolCall('A'))]);

    const { steps, summary } = buildInterruptedRound({
      tracker,
      startTime,
      endTime,
      modelProvider: modelProvider([
        { connectorId: 'main', model: 'gpt', tokens: { prompt: 10, completion: 5 } },
      ]),
      mainConnectorId: 'main',
      configurationOverrides: { skill_ids: ['s'] },
    });

    expect(steps.map((step) => step.type)).toEqual([
      ConversationRoundStepType.relevantSkills,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.updateTodos,
    ]);
    expect(steps[1]).toMatchObject({ tool_call_id: 'A', results: [] });
    expect(summary).toEqual({
      time_to_last_token: 2500,
      trace_id: 'trace-1',
      configuration_overrides: { skill_ids: ['s'] },
      model_usage: {
        connector_id: 'main',
        llm_calls: 1,
        input_tokens: 10,
        output_tokens: 5,
        model: 'gpt',
      },
    });
  });

  it('falls back to the seeded steps when the stream failed before any state was streamed', () => {
    const { tracker } = freshTracker([relevantSkills, carriedTodos]);

    const { steps } = buildInterruptedRound({
      tracker,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(steps).toEqual([relevantSkills, carriedTodos]);
  });

  it('omits configuration_overrides when absent', () => {
    const { steps, summary } = buildInterruptedRound({
      tracker: freshTracker().tracker,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(steps).toEqual([]);
    expect(summary).toEqual({
      time_to_last_token: 2500,
      trace_id: 'trace-1',
      model_usage: { connector_id: 'main', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
    });
    expect(summary).not.toHaveProperty('configuration_overrides');
  });

  it('includes progress recorded for a call that never resolved', () => {
    const { tracker, ran } = freshTracker();
    ran([stepUpdates.appendToolCall(toolCall('A'))]);
    tracker.recordEvent({
      type: ChatEventType.toolProgress,
      data: { tool_call_id: 'A', tool_id: 'tool-A', message: 'halfway' },
    } as ChatAgentEvent);

    const { steps } = buildInterruptedRound({
      tracker,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(steps).toEqual([
      expect.objectContaining({ tool_call_id: 'A', progression: [{ message: 'halfway' }] }),
    ]);
  });

  it('includes a todo_write observed after the last node output', () => {
    const { tracker, ran } = freshTracker([carriedTodos]);
    ran([stepUpdates.append(reasoning('planning'))]);
    tracker.recordEvent({
      type: ChatEventType.toolUi,
      data: {
        tool_call_id: 'todo',
        tool_id: 'todo_write',
        custom_event: TODOS_UPDATED_UI_EVENT,
        data: { todos: [{ content: 'y', status: 'in_progress' }] },
      },
    } as ChatAgentEvent);

    const { steps } = buildInterruptedRound({
      tracker,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(steps).toEqual([
      reasoning('planning'),
      {
        type: ConversationRoundStepType.updateTodos,
        todos: [{ content: 'y', status: 'in_progress' }],
      },
    ]);
  });

  it('on a resume, only owns the resolved paused calls and the new steps', () => {
    const inherited = [relevantSkills, toolCall('done', [result('done')]), toolCall('paused')];
    const { tracker, ran } = trackerFor({
      steps: inherited,
      inherited: { steps: inherited, pendingToolCallIds: ['paused'] },
    });
    ran([
      stepUpdates.resolveToolCall({
        toolCallId: 'paused',
        toolId: 'tool-paused',
        results: [result('paused')],
        progression: [{ message: 'resumed' }],
      }),
      stepUpdates.append(reasoning('after')),
    ]);

    const { steps } = buildInterruptedRound({
      tracker,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(steps).toEqual([
      expect.objectContaining({
        tool_call_id: 'paused',
        results: [result('paused')],
        progression: [{ message: 'resumed' }],
      }),
      reasoning('after'),
    ]);
  });
});
