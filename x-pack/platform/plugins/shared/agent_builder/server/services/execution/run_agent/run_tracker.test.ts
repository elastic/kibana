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
  type ChatAgentEvent,
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { createRootStateChunkEvent } from '../../../test_utils/graph_stream';
import { RunTracker, projectExecutionSteps } from './run_tracker';
import { applyStepUpdates, stepUpdates } from './step_state';
import type { ToolRenderStateMap } from './transient_state';

const toolCall = (id: string, results: ToolCallStep['results'] = []): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my_tool',
  params: {},
  results,
  progression: [],
});
const reasoning = (text: string): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});
const result = (id: string) => ({ tool_result_id: id, type: ToolResultType.other, data: {} });
const progressEvent = (toolCallId: string, message: string): ChatAgentEvent => ({
  type: ChatEventType.toolProgress,
  data: { tool_call_id: toolCallId, message },
});
const otherUiEvent = (): ChatAgentEvent =>
  ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'some_tool',
      tool_call_id: 'c1',
      custom_event: 'some_ui_event',
      data: {},
    },
  } as ChatAgentEvent);

const GRAPH = 'my-graph';
const stateChunk = (
  steps: ConversationRoundStep[],
  toolRenderState: ToolRenderStateMap = {},
  metadata: Record<string, unknown> = {}
) => createRootStateChunkEvent(GRAPH, { steps, toolRenderState }, metadata);

describe('projectExecutionSteps', () => {
  it('owns every step of a fresh execution, including seeded pre-execution steps', () => {
    const steps = [reasoning('compaction-ish'), toolCall('c1')];
    expect(projectExecutionSteps({ steps, renderState: {} })).toEqual(steps);
  });

  it('excludes inherited steps on resume and projects resolved pending calls with delta progression only', () => {
    const done = toolCall('done', [result('r0')]);
    const pending = { ...toolCall('pending'), progression: [{ message: 'before pause' }] };
    const inherited = [reasoning('old'), done, pending];
    const steps = applyStepUpdates(inherited, [
      stepUpdates.resolveToolCall({
        toolCallId: 'pending',
        toolId: 'my_tool',
        results: [result('r1')],
        progression: [{ message: 'after resume' }],
      }),
      stepUpdates.append(reasoning('new')),
    ]);
    // logical state has the full progression
    expect((steps[2] as ToolCallStep).progression).toEqual([
      { message: 'before pause' },
      { message: 'after resume' },
    ]);

    const projection = projectExecutionSteps({
      steps,
      renderState: {},
      inherited: { steps: inherited, pendingToolCallIds: ['pending'] },
    });
    expect(projection).toEqual([
      { ...toolCall('pending', [result('r1')]), progression: [{ message: 'after resume' }] },
      reasoning('new'),
    ]);
  });

  it('still projects a seed-pending call that stayed pending (re-prompted)', () => {
    const inherited = { steps: [toolCall('pending')], pendingToolCallIds: ['pending'] };
    expect(projectExecutionSteps({ steps: inherited.steps, renderState: {}, inherited })).toEqual([
      toolCall('pending'),
    ]);
  });

  it('keeps an inherited answered question out of the projection but owns a new one', () => {
    const question = (id: string) => ({
      type: ConversationRoundStepType.askUserQuestion as const,
      prompt_id: id,
      questions: [{ question: 'q', options: [{ label: 'a' }], multi_select: false }],
    });
    const inherited = { steps: [question('q1')], pendingToolCallIds: [] };
    const steps = applyStepUpdates(inherited.steps, [stepUpdates.upsertQuestion(question('q2'))]);
    expect(projectExecutionSteps({ steps, renderState: {}, inherited })).toEqual([question('q2')]);
  });

  it('fails loudly when the inherited prefix no longer matches (a reducer change broke ordering)', () => {
    const inherited = { steps: [reasoning('old'), toolCall('c1')], pendingToolCallIds: [] };
    // a step inserted before the inherited ones
    expect(() =>
      projectExecutionSteps({
        steps: [reasoning('inserted'), reasoning('old'), toolCall('c1')],
        renderState: {},
        inherited,
      })
    ).toThrow(/inherited step 1 \(tool_call\) is now reasoning/);
    // a tool call swapped for another one at an inherited position
    expect(() =>
      projectExecutionSteps({
        steps: [reasoning('old'), toolCall('other')],
        renderState: {},
        inherited,
      })
    ).toThrow(/inherited step 1/);
    // fewer steps than inherited
    expect(() =>
      projectExecutionSteps({ steps: [reasoning('old')], renderState: {}, inherited })
    ).toThrow(/1 steps for 2 inherited ones/);
  });

  it('drops browser and dedicated-lifecycle calls using the render state', () => {
    const steps = [toolCall('srv'), toolCall('brw'), toolCall('ded')];
    expect(
      projectExecutionSteps({
        steps,
        renderState: {
          srv: { toolName: 'x', kind: 'server' },
          brw: { toolName: 'browser_x', kind: 'browser' },
          ded: { toolName: 'y', kind: 'dedicated' },
        },
      })
    ).toEqual([toolCall('srv')]);
  });
});

describe('RunTracker', () => {
  it('reports the seed until the graph streams a state, then the latest streamed state', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({
      steps: [reasoning('seeded')],
      toolRenderState: { c0: { toolName: 'x', kind: 'server' } },
    });
    expect(tracker.latestState()).toEqual({
      steps: [reasoning('seeded')],
      toolRenderState: { c0: { toolName: 'x', kind: 'server' } },
      currentCycle: 0,
      errorCount: 0,
      pendingToolCallIds: [],
    });
    expect(() => tracker.finalState()).toThrow(/without streaming any state/);

    tracker.observeGraphEvent(stateChunk([reasoning('seeded'), toolCall('c1')]));
    tracker.observeGraphEvent(
      stateChunk([reasoning('seeded'), toolCall('c1', [result('r1')])], {
        c1: { toolName: 'x', kind: 'server' },
      })
    );
    expect(tracker.latestState()).toEqual({
      steps: [reasoning('seeded'), toolCall('c1', [result('r1')])],
      toolRenderState: { c1: { toolName: 'x', kind: 'server' } },
      currentCycle: 0,
      errorCount: 0,
      pendingToolCallIds: [],
    });
    expect(tracker.finalState()).toBe(tracker.latestState());
  });

  it('exposes pendingToolCallIds on the latest snapshot', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [] });
    tracker.observeGraphEvent(
      createRootStateChunkEvent(GRAPH, { steps: [toolCall('tc1')], pendingToolCallIds: ['tc1'] })
    );
    expect(tracker.latestState().pendingToolCallIds).toEqual(['tc1']);
  });

  it('seeds pendingToolCallIds from the inherited pending calls until the first chunk', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({
      steps: [toolCall('tc1')],
      inherited: { steps: [toolCall('tc1')], pendingToolCallIds: ['tc1'] },
    });
    expect(tracker.latestState().pendingToolCallIds).toEqual(['tc1']);

    tracker.observeGraphEvent(stateChunk([toolCall('tc1', [result('r1')])]));
    expect(tracker.latestState().pendingToolCallIds).toEqual([]);
  });

  it('rejects a chunk without pendingToolCallIds as malformed', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [reasoning('seeded')] });
    tracker.observeGraphEvent({
      ...stateChunk([toolCall('c1')]),
      data: {
        chunk: { steps: [toolCall('c1')], toolRenderState: {}, currentCycle: 0, errorCount: 0 },
      },
    });
    expect(tracker.latestState().steps).toEqual([reasoning('seeded')]);
  });

  it('ignores stream chunks that are not the root state of this run', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [] });
    // a nested run of this same graph (sub-agent) under one of our nodes
    tracker.observeGraphEvent(
      stateChunk([reasoning('nested')], {}, { langgraph_node: 'executeTool' })
    );
    // another graph
    tracker.observeGraphEvent(
      createRootStateChunkEvent('other-graph', { steps: [reasoning('o')] })
    );
    // an `updates`-shaped chunk (streamMode not set to values)
    tracker.observeGraphEvent(
      createRootStateChunkEvent(GRAPH, { researchAgent: { steps: [reasoning('u')] } })
    );
    // a node's on_chain_end
    tracker.observeGraphEvent({
      ...stateChunk([reasoning('end')]),
      event: 'on_chain_end',
      name: 'researchAgent',
    });
    expect(tracker.latestState().steps).toEqual([]);
  });

  it('once the root run started, accepts chunks by run id only', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [] });
    tracker.observeGraphEvent({
      ...stateChunk([]),
      event: 'on_chain_start',
      run_id: 'root',
    });
    // a same-named run with another id, even without inherited node metadata
    tracker.observeGraphEvent({ ...stateChunk([reasoning('other')]), run_id: 'nested' });
    expect(tracker.latestState().steps).toEqual([]);
    tracker.observeGraphEvent({ ...stateChunk([reasoning('ours')]), run_id: 'root' });
    expect(tracker.latestState().steps).toEqual([reasoning('ours')]);
    // a later same-named start does not steal the root id
    tracker.observeGraphEvent({
      ...stateChunk([]),
      event: 'on_chain_start',
      run_id: 'nested-2',
    });
    tracker.observeGraphEvent({ ...stateChunk([reasoning('nested-2')]), run_id: 'nested-2' });
    expect(tracker.latestState().steps).toEqual([reasoning('ours')]);
  });

  it('buffers tool progress and drains it once', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.recordEvent(progressEvent('c1', 'one'));
    tracker.recordEvent(progressEvent('c1', 'two'));
    tracker.recordEvent(progressEvent('c2', 'other'));
    expect(tracker.drainProgress('c1')).toEqual([{ message: 'one' }, { message: 'two' }]);
    expect(tracker.drainProgress('c1')).toEqual([]);
    expect(tracker.drainProgress('c2')).toEqual([{ message: 'other' }]);
  });

  it('attaches undrained progress to unresolved calls (pause or failure)', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [] });
    tracker.observeGraphEvent(stateChunk([toolCall('c1')]));
    tracker.recordEvent(progressEvent('c1', 'halfway'));
    expect(tracker.latestState().steps[0]).toMatchObject({ progression: [] });
    expect(tracker.attachUnseen(tracker.latestState().steps)[0]).toMatchObject({
      tool_call_id: 'c1',
      progression: [{ message: 'halfway' }],
    });
    expect(tracker.executionProjection()[0]).toMatchObject({
      tool_call_id: 'c1',
      progression: [{ message: 'halfway' }],
    });
  });

  it('ignores tool UI events that are not progress', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    tracker.seed({ steps: [] });
    tracker.recordEvent(otherUiEvent());
    expect(tracker.executionProjection()).toEqual([]);
  });

  it('projects from an explicit state (the final graph state) when given one', () => {
    const tracker = new RunTracker({ graphName: GRAPH });
    const inherited = [toolCall('pending')];
    tracker.seed({
      steps: inherited,
      inherited: { steps: inherited, pendingToolCallIds: ['pending'] },
    });
    const finalSteps = applyStepUpdates(inherited, [
      stepUpdates.resolveToolCall({
        toolCallId: 'pending',
        toolId: 'my_tool',
        results: [result('r1')],
        progression: [],
      }),
      stepUpdates.appendToolCall(toolCall('b1')),
    ]);
    expect(
      tracker.executionProjection({
        steps: finalSteps,
        toolRenderState: { b1: { toolName: 'browser_x', kind: 'browser' } },
        currentCycle: 1,
        errorCount: 0,
        pendingToolCallIds: [],
      })
    ).toEqual([toolCall('pending', [result('r1')])]);
  });
});
