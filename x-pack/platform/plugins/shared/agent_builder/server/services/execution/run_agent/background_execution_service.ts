/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import { ExecutionStatus, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import type { SubAgentExecutor } from '@kbn/agent-builder-server';

const TERMINAL_STATUSES = new Set<string>([
  ExecutionStatus.completed,
  ExecutionStatus.failed,
  ExecutionStatus.aborted,
]);

const COMPLETION_CHECK_CONCURRENCY = 5;

export class BackgroundExecutionService {
  private state: Record<string, BackgroundExecutionState>;
  private readonly subAgentExecutor: SubAgentExecutor;

  constructor({
    subAgentExecutor,
    initialState = {},
  }: {
    subAgentExecutor: SubAgentExecutor;
    initialState?: Record<string, BackgroundExecutionState>;
  }) {
    this.subAgentExecutor = subAgentExecutor;
    this.state = { ...initialState };
  }

  /** Register a new background execution (called by the run_subagent tool). */
  registerExecution(executionId: string): void {
    this.state[executionId] = {
      execution_id: executionId,
      status: ExecutionStatus.running,
    };
  }

  /** Check all pending executions for completion. Returns newly completed ones. */
  async checkForCompletions({
    roundId,
    toolCallGroupId,
  }: {
    roundId: string;
    toolCallGroupId?: string;
  }): Promise<BackgroundExecutionState[]> {
    const pending = Object.values(this.state).filter((exec) => !TERMINAL_STATUSES.has(exec.status));

    if (pending.length === 0) return [];

    const limit = pLimit(COMPLETION_CHECK_CONCURRENCY);

    const results = await Promise.all(
      pending.map((entry) =>
        limit(async (): Promise<BackgroundExecutionState | undefined> => {
          const execution = await this.subAgentExecutor.getExecution(entry.execution_id);
          if (!execution || !TERMINAL_STATUSES.has(execution.status)) {
            return undefined;
          }

          const updated: BackgroundExecutionState = {
            ...entry,
            status: execution.status as ExecutionStatus,
            completed_at: { round_id: roundId, tool_call_group_id: toolCallGroupId },
          };

          if (execution.status === ExecutionStatus.completed) {
            const roundComplete = execution.events.find(isRoundCompleteEvent);
            if (roundComplete) {
              updated.response = roundComplete.data.round.response;
            }
          }

          if (execution.error) {
            updated.error = execution.error as BackgroundExecutionState['error'];
          }

          return updated;
        })
      )
    );

    const completions: BackgroundExecutionState[] = [];
    for (const updated of results) {
      if (!updated) {
        continue;
      }
      this.state[updated.execution_id] = updated;
      completions.push(updated);
    }

    return completions;
  }

  /** Get the full state for persistence in ConversationInternalState. */
  getState(): Record<string, BackgroundExecutionState> {
    return { ...this.state };
  }

  /** Get only pending (non-terminal) executions for persistence. */
  getPendingState(): Record<string, BackgroundExecutionState> {
    return Object.fromEntries(
      Object.entries(this.state).filter(([_, exec]) => !TERMINAL_STATUSES.has(exec.status))
    );
  }

  /** Whether there are any pending (non-terminal) executions. */
  hasPending(): boolean {
    return Object.values(this.state).some((exec) => !TERMINAL_STATUSES.has(exec.status));
  }
}
