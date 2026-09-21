/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  type ConversationRoundStep,
} from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import { createRound } from '../../../../test_utils/conversations';
import type { ConvertedEvents } from '../convert_graph_events';
import { buildInterruptedRound, eventsToSteps } from './round_summary';

jest.mock('../../../../tracing', () => ({
  getCurrentTraceId: () => 'trace-1',
}));

const reasoning = (text: string, transient?: boolean): ConvertedEvents =>
  ({
    type: ChatEventType.reasoning,
    data: { reasoning: text, ...(transient ? { transient: true } : {}) },
  } as ConvertedEvents);

const toolCall = (id: string): ConvertedEvents =>
  ({
    type: ChatEventType.toolCall,
    data: { tool_call_id: id, tool_id: `tool-${id}`, params: { q: id } },
  } as ConvertedEvents);

const toolResult = (id: string): ConvertedEvents =>
  ({
    type: ChatEventType.toolResult,
    data: { tool_call_id: id, tool_id: `tool-${id}`, results: [{ type: 'other', data: id }] },
  } as unknown as ConvertedEvents);

const modelProvider = (calls: unknown[] = []) =>
  ({ getUsageStats: () => ({ calls }) } as unknown as ModelProvider);

describe('eventsToSteps', () => {
  it('maps reasoning and tool calls in order, with empty results for a call that never resolved', () => {
    const steps = eventsToSteps({
      events: [reasoning('think'), toolCall('A'), toolResult('A'), toolCall('B')],
    });

    expect(steps).toEqual([
      expect.objectContaining({ type: ConversationRoundStepType.reasoning, reasoning: 'think' }),
      expect.objectContaining({
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'A',
        results: [{ type: 'other', data: 'A' }],
      }),
      expect.objectContaining({
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'B',
        results: [],
      }),
    ]);
  });

  it('skips transient reasoning', () => {
    expect(eventsToSteps({ events: [reasoning('tmp', true), reasoning('kept')] })).toEqual([
      expect.objectContaining({ reasoning: 'kept' }),
    ]);
  });

  it('appends a carried-over todos step when initial todos exist and no todos_updated event was seen', () => {
    const todos = [{ id: 't1', content: 'x', status: 'pending' }] as never;
    const steps = eventsToSteps({ events: [], initialTodos: todos });

    expect(steps).toEqual([
      { type: ConversationRoundStepType.updateTodos, todos, carried_over: true },
    ]);
  });

  it('prepends a relevant_skills step when a selection is provided', () => {
    const steps = eventsToSteps({
      events: [reasoning('r')],
      relevantSkillsSelection: { skills: [{ id: 's1' }] } as never,
    });

    expect(steps[0]).toMatchObject({ type: ConversationRoundStepType.relevantSkills });
    expect(steps[1]).toMatchObject({ reasoning: 'r' });
  });
});

describe('buildInterruptedRound', () => {
  const startTime = new Date('2026-01-01T00:00:00.000Z');
  const endTime = new Date('2026-01-01T00:00:02.500Z');

  it('builds the steps and the partial summary for a fresh round', () => {
    const { steps, summary } = buildInterruptedRound({
      events: [toolCall('A')],
      pendingRound: undefined,
      startTime,
      endTime,
      modelProvider: modelProvider([
        { connectorId: 'main', model: 'gpt', tokens: { prompt: 10, completion: 5 } },
      ]),
      mainConnectorId: 'main',
      configurationOverrides: { skill_ids: ['s'] } as never,
      relevantSkillsSelection: { skills: [{ id: 's1' }] } as never,
      initialTodos: [{ id: 't1', content: 'x', status: 'pending' }] as never,
    });

    expect(steps.map((step) => step.type)).toEqual([
      ConversationRoundStepType.relevantSkills,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.updateTodos,
    ]);
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

  it('omits trace_id and configuration_overrides when absent', () => {
    const { summary } = buildInterruptedRound({
      events: [],
      pendingRound: undefined,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
    });

    expect(summary).toEqual({
      time_to_last_token: 2500,
      trace_id: 'trace-1',
      model_usage: { connector_id: 'main', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
    });
    expect(summary).not.toHaveProperty('configuration_overrides');
  });

  it('on a resume, leads with the resolved paused tool calls and skips relevant skills and todos', () => {
    const pendingRound = {
      ...createRound({ status: ConversationRoundStatus.awaitingPrompt }),
      steps: [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'paused',
          tool_id: 'my_tool',
          params: {},
          results: [],
          progression: [],
        } as ConversationRoundStep,
      ],
    };

    const { steps } = buildInterruptedRound({
      events: [toolResult('paused'), reasoning('after')],
      pendingRound,
      startTime,
      endTime,
      modelProvider: modelProvider(),
      mainConnectorId: 'main',
      relevantSkillsSelection: { skills: [{ id: 's1' }] } as never,
      initialTodos: [{ id: 't1', content: 'x', status: 'pending' }] as never,
    });

    expect(steps).toEqual([
      expect.objectContaining({
        tool_call_id: 'paused',
        results: [{ type: 'other', data: 'paused' }],
      }),
      expect.objectContaining({ reasoning: 'after' }),
    ]);
  });
});
