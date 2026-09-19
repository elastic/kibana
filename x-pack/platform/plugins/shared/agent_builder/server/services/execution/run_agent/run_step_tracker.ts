/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type {
  ChatAgentEvent,
  ConversationRoundStep,
  ToolCallProgress,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  isTodosUpdatedEvent,
  isToolCallStep,
  isToolProgressEvent,
} from '@kbn/agent-builder-common';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import { matchGraphName } from '@kbn/agent-builder-genai-utils/langchain';
import { steps as nodeNames } from './constants';
import { applyStepUpdates, persistableSteps, stepUpdates, type RunStepUpdate } from './step_state';
import {
  mergeToolRenderState,
  type ToolRenderStateMap,
  type ToolRenderStateUpdate,
} from './transient_state';

const NODE_NAMES: ReadonlySet<string> = new Set(Object.values(nodeNames));

/**
 * True for the `on_chain_end` of one of *our* nodes running in the *root* graph of this run.
 * Node names are reused by nested graphs (a sub-agent runs this same graph; tool-internal graphs
 * have their own names) and inherited metadata is not enough to tell them apart, so this checks:
 * - `metadata.graphName` (what `convertGraphEvents` already filters on),
 * - `event.name === metadata.langgraph_node` (the node's own run, not a runnable inside it — the
 *   same test LangGraph uses in its stream handlers),
 * - a single-segment `langgraph_checkpoint_ns` (LangGraph joins nested namespaces with `|`; any
 *   graph invoked under one of our nodes with an inherited config gets a `parent|child` namespace).
 */
export const isRootGraphNodeEnd = (event: LangchainStreamEvent, graphName: string): boolean => {
  if (event.event !== 'on_chain_end' || !NODE_NAMES.has(event.name)) return false;
  if (!matchGraphName(event, graphName)) return false;
  const { langgraph_node: node, langgraph_checkpoint_ns: namespace } = event.metadata ?? {};
  if (node !== event.name) return false;
  return typeof namespace !== 'string' || !namespace.includes('|');
};

/** The narrow view of the tracker handed to the graph's `executeTool` node. */
export interface ToolExecutionBuffer {
  /** Returns and clears the progress buffered for a tool call since it started executing. */
  drainProgress(toolCallId: string): ToolCallProgress[];
  /** Returns and clears the latest `todo_write` payload observed since the last call, if any. */
  consumeTodosWrite(): TodoItem[] | undefined;
}

export type ExecutionKind = 'fresh' | 'resume';

/**
 * Mirrors the graph's `steps` channel from streamed node outputs so `run_chat_agent` can persist the
 * run even when the stream ends before the final state is available, and buffers out-of-band tool
 * events (progress, todos writes) that LangGraph does not see.
 */
export class RunStepTracker implements ToolExecutionBuffer {
  private readonly graphName: string;
  private steps: ConversationRoundStep[] = [];
  /** Step objects seeded from a previous execution (by identity). Untouched ones are not persisted again. */
  private inherited: Set<ConversationRoundStep> = new Set();
  /** Tool calls that were pending when this execution started; persisted with delta progression. */
  private seedPendingIds: Set<string> = new Set();
  private progressionDeltas: Map<string, ToolCallProgress[]> = new Map();
  private bufferedProgress: Map<string, ToolCallProgress[]> = new Map();
  private renderState: ToolRenderStateMap = {};
  private pendingTodos: TodoItem[] | undefined;

  constructor({ graphName }: { graphName: string }) {
    this.graphName = graphName;
  }

  seed(
    steps: ConversationRoundStep[],
    { execution, pendingToolCallIds }: { execution: ExecutionKind; pendingToolCallIds: string[] }
  ): void {
    this.steps = [...steps];
    this.inherited = execution === 'resume' ? new Set(steps) : new Set();
    this.seedPendingIds = new Set(execution === 'resume' ? pendingToolCallIds : []);
  }

  apply(updates: RunStepUpdate[]): void {
    for (const update of updates) {
      if (update.type === 'resolve_tool_call') {
        this.progressionDeltas.set(update.toolCallId, update.progression);
      }
    }
    this.steps = applyStepUpdates(this.steps, updates);
  }

  /**
   * Applies the `steps` and `toolRenderState` updates emitted by a root-graph node when its
   * `on_chain_end` event streams by, so the tracker mirrors both channels. Events from nested
   * graphs that reuse our node names are ignored (see `isRootGraphNodeEnd`).
   */
  observeGraphEvent(event: LangchainStreamEvent): void {
    if (!isRootGraphNodeEnd(event, this.graphName)) {
      return;
    }
    const output = event.data?.output as
      | { steps?: unknown; toolRenderState?: ToolRenderStateUpdate }
      | undefined;
    if (Array.isArray(output?.steps)) {
      this.apply(output.steps as RunStepUpdate[]);
    }
    if (output?.toolRenderState) {
      this.renderState = mergeToolRenderState(this.renderState, output.toolRenderState);
    }
  }

  /** The mirrored `toolRenderState`; used by the interruption path, which has no final graph state. */
  getRenderState(): ToolRenderStateMap {
    return this.renderState;
  }

  recordEvent(event: ChatAgentEvent): void {
    if (isToolProgressEvent(event)) {
      const { tool_call_id: toolCallId, message, metadata } = event.data;
      const buffered = this.bufferedProgress.get(toolCallId) ?? [];
      buffered.push(metadata ? { message, metadata } : { message });
      this.bufferedProgress.set(toolCallId, buffered);
      return;
    }
    if (isTodosUpdatedEvent(event)) {
      this.pendingTodos = event.data.data.todos;
    }
  }

  drainProgress(toolCallId: string): ToolCallProgress[] {
    const buffered = this.bufferedProgress.get(toolCallId) ?? [];
    this.bufferedProgress.delete(toolCallId);
    return buffered;
  }

  consumeTodosWrite(): TodoItem[] | undefined {
    const todos = this.pendingTodos;
    this.pendingTodos = undefined;
    return todos;
  }

  /** The raw mirror of the graph's `steps` channel (deep-equal to the final graph state on success). */
  getSteps(): ConversationRoundStep[] {
    return this.steps;
  }

  /**
   * The mirror plus what LangGraph never saw: undrained progress on calls that did not resolve
   * (interrupted by a prompt, or failed mid-execution) and a `todo_write` that `executeTool` did not
   * get to fold in. This is what persistence uses for the round's full steps.
   */
  snapshotSteps(): ConversationRoundStep[] {
    const withProgress = this.steps.map((step) => {
      if (!isToolCallStep(step)) return step;
      const buffered = this.bufferedProgress.get(step.tool_call_id);
      if (!buffered?.length) return step;
      return { ...step, progression: [...(step.progression ?? []), ...buffered] };
    });
    return this.pendingTodos
      ? applyStepUpdates(withProgress, [
          stepUpdates.setTodos({
            type: ConversationRoundStepType.updateTodos,
            todos: this.pendingTodos,
          }),
        ])
      : withProgress;
  }

  /**
   * The steps this execution owns, ready for `execution_step` persistence: fresh executions own every
   * step; resumes own new steps, rewritten todos, and every call that was pending at seed time (with
   * only the progression observed since — mirroring today's `resolvePausedToolCallSteps`). Browser
   * and dedicated-lifecycle calls are dropped using the mirrored render state.
   */
  executionProjection(): ConversationRoundStep[] {
    const owned: ConversationRoundStep[] = [];
    // snapshotSteps() keeps step identities except for calls that received progress and a todos
    // step rebuilt from a pending write — both of which are owned by this execution by definition.
    for (const step of this.snapshotSteps()) {
      if (!isToolCallStep(step)) {
        if (!this.inherited.has(step)) {
          owned.push(step);
        }
        continue;
      }
      const { tool_call_id: toolCallId } = step;
      if (this.seedPendingIds.has(toolCallId)) {
        const delta = this.progressionDeltas.get(toolCallId) ?? [];
        const buffered = this.bufferedProgress.get(toolCallId) ?? [];
        owned.push({ ...step, progression: [...delta, ...buffered] });
        continue;
      }
      // snapshotSteps() returns the same object when no progress was attached, so identity still works
      const original = this.steps.find((s) => isToolCallStep(s) && s.tool_call_id === toolCallId);
      if (original && this.inherited.has(original)) {
        continue;
      }
      owned.push(step);
    }
    return persistableSteps(owned, this.renderState);
  }
}
