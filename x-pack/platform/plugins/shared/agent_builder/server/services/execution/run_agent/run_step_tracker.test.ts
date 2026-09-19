/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStepType,
  TODOS_UPDATED_UI_EVENT,
  type ChatAgentEvent,
  type ConversationRoundStep,
  type TodosStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { RunStepTracker } from './run_step_tracker';
import { applyStepUpdates, stepUpdates } from './step_state';

const toolCall = (id: string, results: ToolCallStep['results'] = []): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my_tool',
  params: {},
  results,
  progression: [],
});
const reasoning = (text: string): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});
const todos = (id: string): TodosStep => ({
  type: ConversationRoundStepType.updateTodos,
  todos: [{ id, content: id, status: 'pending' }],
});
const progressEvent = (toolCallId: string, message: string): ChatAgentEvent => ({
  type: ChatEventType.toolProgress,
  data: { tool_call_id: toolCallId, message },
});
const todosUiEvent = (ids: string[]): ChatAgentEvent =>
  ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'todo_write',
      tool_call_id: 'c1',
      custom_event: TODOS_UPDATED_UI_EVENT,
      data: { todos: ids.map((id) => ({ id, content: id, status: 'pending' })) },
    },
  } as ChatAgentEvent);

/** An `on_chain_end` for one of our nodes in the root graph, with the metadata LangGraph attaches. */
const nodeEnd = (name: string, output: unknown, metadata: Record<string, unknown> = {}) =>
  ({
    event: 'on_chain_end',
    name,
    run_id: 'run',
    metadata: {
      graphName: 'my-graph',
      langgraph_node: name,
      langgraph_checkpoint_ns: `${name}:task`,
      ...metadata,
    },
    data: { output },
  } as any);

describe('RunStepTracker', () => {
  it('owns every step of a fresh execution, including seeded pre-execution steps', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    const seeded = [reasoning('compaction-ish'), todos('carried')];
    tracker.seed(seeded, { execution: 'fresh', pendingToolCallIds: [] });
    tracker.apply([stepUpdates.appendToolCall(toolCall('c1'))]);
    const projection = tracker.executionProjection();
    expect(projection.map((s) => s.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.updateTodos,
    ]);
  });

  it('converges with applyStepUpdates', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    const updates = [
      stepUpdates.append(reasoning('r')),
      stepUpdates.appendToolCall(toolCall('c1')),
      stepUpdates.resolveToolCall({
        toolCallId: 'c1',
        toolId: 'my_tool',
        results: [],
        progression: [],
      }),
    ];
    tracker.apply(updates);
    expect(tracker.getSteps()).toEqual(applyStepUpdates([], updates));
  });

  it('excludes inherited steps on resume and projects resolved pending calls with delta progression only', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    const done = toolCall('done', [{ type: 'other', data: {} }]);
    const pending = { ...toolCall('pending'), progression: [{ message: 'before pause' }] };
    tracker.seed([reasoning('old'), done, pending], {
      execution: 'resume',
      pendingToolCallIds: ['pending'],
    });
    tracker.apply([
      stepUpdates.resolveToolCall({
        toolCallId: 'pending',
        toolId: 'my_tool',
        results: [{ type: 'other', data: { ok: true } }],
        progression: [{ message: 'after resume' }],
      }),
      stepUpdates.append(reasoning('new')),
    ]);
    // logical state has the full progression
    const logical = tracker.getSteps()[2] as ToolCallStep;
    expect(logical.progression).toEqual([{ message: 'before pause' }, { message: 'after resume' }]);
    // projection has only what this execution added
    const projection = tracker.executionProjection();
    expect(projection).toHaveLength(2);
    expect(projection[0]).toMatchObject({
      tool_call_id: 'pending',
      results: [{ type: 'other', data: { ok: true } }],
      progression: [{ message: 'after resume' }],
    });
    expect(projection[1]).toMatchObject({ reasoning: 'new' });
  });

  it('includes a rewritten todos step but not an untouched inherited one', () => {
    const untouched = new RunStepTracker({ graphName: 'my-graph' });
    untouched.seed([todos('a')], { execution: 'resume', pendingToolCallIds: [] });
    expect(untouched.executionProjection()).toEqual([]);

    const rewritten = new RunStepTracker({ graphName: 'my-graph' });
    rewritten.seed([todos('a')], { execution: 'resume', pendingToolCallIds: [] });
    rewritten.apply([stepUpdates.setTodos(todos('b'))]);
    expect(rewritten.executionProjection()).toEqual([todos('b')]);
  });

  it('still projects a seed-pending call that stayed pending (re-prompted), like resolvePausedToolCallSteps did', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([toolCall('pending')], { execution: 'resume', pendingToolCallIds: ['pending'] });
    tracker.recordEvent(progressEvent('pending', 'asked again'));
    expect(tracker.executionProjection()).toEqual([
      { ...toolCall('pending'), progression: [{ message: 'asked again' }] },
    ]);
  });

  it('buffers tool progress and drains it once', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    tracker.recordEvent(progressEvent('c1', 'one'));
    tracker.recordEvent(progressEvent('c1', 'two'));
    tracker.recordEvent(progressEvent('c2', 'other'));
    expect(tracker.drainProgress('c1')).toEqual([{ message: 'one' }, { message: 'two' }]);
    expect(tracker.drainProgress('c1')).toEqual([]);
    expect(tracker.drainProgress('c2')).toEqual([{ message: 'other' }]);
  });

  it('attaches undrained progress to unresolved calls in snapshots and projections (pause or failure)', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    tracker.apply([stepUpdates.appendToolCall(toolCall('c1'))]);
    tracker.recordEvent(progressEvent('c1', 'halfway'));
    expect(tracker.getSteps()[0]).toMatchObject({ progression: [] });
    expect(tracker.snapshotSteps()[0]).toMatchObject({
      tool_call_id: 'c1',
      progression: [{ message: 'halfway' }],
    });
    expect(tracker.executionProjection()[0]).toMatchObject({
      tool_call_id: 'c1',
      progression: [{ message: 'halfway' }],
    });
  });

  it('buffers the latest todos payload, consumes it once, and applies an unconsumed write to snapshots', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    expect(tracker.consumeTodosWrite()).toBeUndefined();
    tracker.recordEvent(todosUiEvent(['a']));
    tracker.recordEvent(todosUiEvent(['b']));
    // unconsumed (e.g. the tool node failed right after todo_write): snapshot carries the todos step
    expect(tracker.snapshotSteps().at(-1)).toMatchObject({
      type: ConversationRoundStepType.updateTodos,
      todos: [{ id: 'b' }],
    });
    expect(tracker.consumeTodosWrite()).toEqual([{ id: 'b', content: 'b', status: 'pending' }]);
    expect(tracker.consumeTodosWrite()).toBeUndefined();
    expect(tracker.snapshotSteps()).toEqual([]);
  });

  it('filters browser tool calls from the projection using the mirrored render state', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    tracker.observeGraphEvent(
      nodeEnd('researchAgent', {
        steps: [stepUpdates.appendToolCall(toolCall('b1'))],
        toolRenderState: { b1: { toolName: 'browser_x', kind: 'browser' } },
      })
    );
    expect(tracker.executionProjection()).toEqual([]);
  });

  it('applies node outputs from on_chain_end events and ignores the graph-level event', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    tracker.observeGraphEvent(
      nodeEnd('researchAgent', {
        steps: [stepUpdates.append(reasoning('r'))],
        toolRenderState: { c1: { toolName: 'x', kind: 'server', cycle: 1 } },
      })
    );
    tracker.observeGraphEvent(
      nodeEnd('executeTool', { steps: [], toolRenderState: { c1: { content: 'done' } } })
    );
    expect(tracker.getRenderState()).toEqual({
      c1: { toolName: 'x', kind: 'server', cycle: 1, content: 'done' },
    });
    // graph-level on_chain_end carries the full state, not updates: ignored
    tracker.observeGraphEvent({
      event: 'on_chain_end',
      name: 'my-graph',
      metadata: { graphName: 'my-graph' },
      data: { output: { steps: [reasoning('full state, not updates')] } },
    } as any);
    expect(tracker.getSteps()).toEqual([reasoning('r')]);
  });

  it('ignores same-named nodes that do not belong to the root graph of this run', () => {
    const tracker = new RunStepTracker({ graphName: 'my-graph' });
    tracker.seed([], { execution: 'fresh', pendingToolCallIds: [] });
    const foreign = { steps: [stepUpdates.appendToolCall(toolCall('c1'))] };
    // a tool-internal graph with its own graphName (e.g. generate_esql)
    tracker.observeGraphEvent(nodeEnd('researchAgent', foreign, { graphName: 'other-graph' }));
    // a nested run of this same graph (sub-agent) under our executeTool node: multi-segment namespace
    tracker.observeGraphEvent(
      nodeEnd('researchAgent', foreign, {
        langgraph_checkpoint_ns: 'executeTool:t1|researchAgent:t2',
      })
    );
    // a runnable *inside* one of our nodes that happens to carry a node name
    tracker.observeGraphEvent(nodeEnd('researchAgent', foreign, { langgraph_node: 'executeTool' }));
    expect(tracker.getSteps()).toEqual([]);

    // the real thing is applied exactly once
    tracker.observeGraphEvent(nodeEnd('researchAgent', foreign));
    expect(tracker.getSteps()).toHaveLength(1);
  });
});
