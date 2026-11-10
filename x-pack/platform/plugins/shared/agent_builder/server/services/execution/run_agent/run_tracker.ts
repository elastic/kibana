/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type {
  ChatAgentEvent,
  CompactionSummary,
  ConversationRoundStep,
  ToolCallProgress,
} from '@kbn/agent-builder-common';
import { isToolCallStep, isToolProgressEvent } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { matchName } from '@kbn/agent-builder-genai-utils/langchain';
import type { StateType } from './state';
import { persistableSteps } from './step_state';
import type { ToolRenderStateMap } from './transient_state';

/** The narrow view of the tracker handed to the graph's `executeTool` node. */
export interface ToolExecutionBuffer {
  /** Returns and clears the progress buffered for a tool call since it started executing. */
  drainProgress(toolCallId: string): ToolCallProgress[];
}

/** The part of the graph state persistence reads. */
export type RunStateSnapshot = Pick<
  StateType,
  'steps' | 'toolRenderState' | 'currentCycle' | 'errorCount' | 'pendingToolCallIds'
> &
  Partial<Pick<StateType, 'compactionSummary' | 'lastCallUsage'>>;

export interface RunSeed {
  /** The steps the graph starts from (what `Overwrite(steps)` seeds). */
  steps: ConversationRoundStep[];
  toolRenderState?: ToolRenderStateMap;
  /** The compaction summary the graph starts from. */
  compactionSummary?: CompactionSummary;
  /**
   * Resume only: the steps inherited from the previous executions of the turn (a prefix of `steps`)
   * and the calls that were still pending among them.
   */
  inherited?: { steps: ConversationRoundStep[]; pendingToolCallIds: string[] };
}

const invalidState = (message: string) =>
  createAgentExecutionError(message, AgentExecutionErrorCode.invalidState, {});

/**
 * True for the root graph's own `on_chain_stream` event. With `streamMode: 'values'` its chunk is
 * the full graph state after a super-step. Nested runs of the same graph (a sub-agent) are told
 * apart by run id once the root `on_chain_start` has been seen — it always precedes any chunk — and
 * by the inherited `langgraph_node` metadata otherwise (a nested run only reaches this stream
 * through its parent node's callbacks, so it necessarily carries the node's metadata).
 */
const isRootGraphStateChunk = (
  event: LangchainStreamEvent,
  graphName: string,
  rootRunId: string | undefined
): boolean => {
  if (event.event !== 'on_chain_stream' || !matchName(event, graphName)) return false;
  return rootRunId !== undefined
    ? event.run_id === rootRunId
    : event.metadata?.langgraph_node === undefined;
};

const isStateSnapshot = (chunk: unknown): chunk is RunStateSnapshot => {
  if (typeof chunk !== 'object' || chunk === null) return false;
  const { steps, toolRenderState, currentCycle, errorCount, pendingToolCallIds } =
    chunk as Partial<RunStateSnapshot>;
  return (
    Array.isArray(steps) &&
    typeof toolRenderState === 'object' &&
    typeof currentCycle === 'number' &&
    typeof errorCount === 'number' &&
    Array.isArray(pendingToolCallIds)
  );
};

/**
 * The steps an execution owns, ready for `execution_step` persistence. A fresh execution owns every
 * step. A resume owns the new steps and every inherited call that was pending at seed time (with
 * only the progression added since). Relies on the reducer's ordering guarantees
 * (`applyStepUpdates`): steps are only appended or resolved in place, so the inherited steps stay
 * a prefix of the steps. Browser and dedicated-lifecycle calls are dropped using the render state.
 */
export const projectExecutionSteps = ({
  steps,
  renderState,
  inherited,
}: {
  steps: ConversationRoundStep[];
  renderState: ToolRenderStateMap;
  inherited?: RunSeed['inherited'];
}): ConversationRoundStep[] => {
  if (!inherited) {
    return persistableSteps(steps, renderState);
  }
  const pendingIds = new Set(inherited.pendingToolCallIds);
  if (steps.length < inherited.steps.length) {
    throw invalidState(
      `[projection] ${steps.length} steps for ${inherited.steps.length} inherited ones`
    );
  }

  const owned: ConversationRoundStep[] = [];
  steps.forEach((step, position) => {
    const inheritedStep = inherited.steps[position];
    if (!inheritedStep) {
      owned.push(step);
      return;
    }
    // A wrong projection would persist silently; a reducer change breaking the prefix must not.
    if (
      step.type !== inheritedStep.type ||
      (isToolCallStep(step) &&
        isToolCallStep(inheritedStep) &&
        step.tool_call_id !== inheritedStep.tool_call_id)
    ) {
      throw invalidState(
        `[projection] inherited step ${position} (${inheritedStep.type}) is now ${step.type}`
      );
    }
    if (
      isToolCallStep(step) &&
      isToolCallStep(inheritedStep) &&
      pendingIds.has(step.tool_call_id)
    ) {
      owned.push({
        ...step,
        progression: (step.progression ?? []).slice(inheritedStep.progression?.length ?? 0),
      });
    }
  });
  return persistableSteps(owned, renderState);
};

/**
 * What LangGraph does not hold for a run: the seed, the latest state it streamed (so the run can be
 * persisted when the stream throws before the final state), and the out-of-band tool progress
 * events it never sees. Not a mirror: the graph is the only reducer.
 */
export class RunTracker implements ToolExecutionBuffer {
  private readonly graphName: string;
  private seedState: RunStateSnapshot = {
    steps: [],
    toolRenderState: {},
    currentCycle: 0,
    errorCount: 0,
    pendingToolCallIds: [],
  };
  private inherited: RunSeed['inherited'];
  private latest: RunStateSnapshot | undefined;
  private rootRunId: string | undefined;
  private bufferedProgress: Map<string, ToolCallProgress[]> = new Map();

  constructor({ graphName }: { graphName: string }) {
    this.graphName = graphName;
  }

  seed({ steps, toolRenderState = {}, compactionSummary, inherited }: RunSeed): void {
    // A HITL resume with pending calls goes straight to `executeTool`: until the first `values`
    // chunk those calls are the ones in flight, so an interruption there must find them here.
    this.seedState = {
      steps,
      toolRenderState,
      currentCycle: 0,
      errorCount: 0,
      pendingToolCallIds: inherited?.pendingToolCallIds ?? [],
      compactionSummary,
    };
    this.inherited = inherited;
    this.latest = undefined;
  }

  /** Remembers the graph state streamed after each super-step (root `values` chunk). */
  observeGraphEvent(event: LangchainStreamEvent): void {
    if (
      this.rootRunId === undefined &&
      event.event === 'on_chain_start' &&
      matchName(event, this.graphName)
    ) {
      // the first start of a run named after the graph is the root run: nested ones come later
      this.rootRunId = event.run_id;
      return;
    }
    if (!isRootGraphStateChunk(event, this.graphName, this.rootRunId)) {
      return;
    }
    const chunk = event.data?.chunk;
    if (isStateSnapshot(chunk)) {
      this.latest = chunk;
    }
  }

  recordEvent(event: ChatAgentEvent): void {
    if (isToolProgressEvent(event)) {
      const { tool_call_id: toolCallId, message, metadata } = event.data;
      const buffered = this.bufferedProgress.get(toolCallId) ?? [];
      buffered.push(metadata ? { message, metadata } : { message });
      this.bufferedProgress.set(toolCallId, buffered);
    }
  }

  drainProgress(toolCallId: string): ToolCallProgress[] {
    const buffered = this.bufferedProgress.get(toolCallId) ?? [];
    this.bufferedProgress.delete(toolCallId);
    return buffered;
  }

  /** The last graph state seen on the stream, else the seed. */
  latestState(): RunStateSnapshot {
    return this.latest ?? this.seedState;
  }

  /**
   * The final graph state of a run that completed: the last streamed chunk. Once the stream has
   * completed this is what the root `on_chain_end` output would be; a completed run that streamed
   * no state is a bug.
   */
  finalState(): RunStateSnapshot {
    if (!this.latest) {
      throw invalidState('[run] the graph completed without streaming any state');
    }
    return this.latest;
  }

  /**
   * `steps` plus what LangGraph never saw: undrained progress on calls that did not resolve
   * (interrupted by a prompt, or failed mid-execution). This is what persistence uses for the
   * round's full steps.
   */
  attachUnseen(steps: ConversationRoundStep[]): ConversationRoundStep[] {
    return steps.map((step) => {
      if (!isToolCallStep(step)) return step;
      const buffered = this.bufferedProgress.get(step.tool_call_id);
      if (!buffered?.length) return step;
      return { ...step, progression: [...(step.progression ?? []), ...buffered] };
    });
  }

  /** The steps this execution owns (see `projectExecutionSteps`), from `state` or the latest known state. */
  executionProjection(state: RunStateSnapshot = this.latestState()): ConversationRoundStep[] {
    return projectExecutionSteps({
      steps: this.attachUnseen(state.steps),
      renderState: state.toolRenderState,
      inherited: this.inherited,
    });
  }
}
