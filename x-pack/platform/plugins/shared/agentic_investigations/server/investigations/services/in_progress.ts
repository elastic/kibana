/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution, ExecutionStart } from '@kbn/agent-builder-server';

/** Ceiling on agent executions one lookup reads. */
export const MAX_IN_PROGRESS_EXECUTIONS = 1000;

/**
 * A running agent execution whose node has not reported liveness for this long is treated as
 * dead. Agent Builder writes a heartbeat every 10s and its followers time out after 60s; this is
 * deliberately looser so a slow node does not flip an investigation out of progress. Agent
 * Builder exports no constant for it.
 */
export const STALE_AGENT_HEARTBEAT_MS = 5 * 60 * 1000;

export interface InProgressResolverDeps {
  getAgentExecutions: () => ExecutionStart;
  logger: Logger;
  now?: () => number;
}

/**
 * Whether an investigation is being worked on: Agent Builder has a scheduled or running execution
 * for its conversation. Nothing is stored; every read asks again.
 *
 * Agent executions are read without an access check (Agent Builder scopes them to the space
 * only), so only conversation ids leave this module, and callers intersect them with
 * access-checked conversation reads. A failed lookup is logged and counts as not in progress:
 * reads must not fail on it.
 */
export class InProgressResolver {
  private readonly now: () => number;

  constructor(private readonly deps: InProgressResolverDeps) {
    this.now = deps.now ?? Date.now;
  }

  /** Conversation ids in progress in the space. */
  async findInProgressIds(request: KibanaRequest, spaceId: string): Promise<Set<string>> {
    return this.findAgentRunConversationIds(request, spaceId);
  }

  /** Whether one investigation is in progress. */
  async isInProgress(
    request: KibanaRequest,
    spaceId: string,
    conversationId: string
  ): Promise<boolean> {
    const ids = await this.findAgentRunConversationIds(request, spaceId);
    return ids.has(conversationId);
  }

  /**
   * On a fresh cluster the agent execution index may not exist yet or have no shard allocated;
   * Agent Builder then throws (for example `no_shard_available_action_exception`). That, like any
   * other failure here, is logged and reads as no agent runs, so it cannot fail the request.
   */
  private async findAgentRunConversationIds(
    request: KibanaRequest,
    spaceId: string
  ): Promise<Set<string>> {
    let executions: AgentExecution[];
    try {
      executions = await this.deps.getAgentExecutions().findExecutions(request, {
        spaceId,
        filter: { status: [ExecutionStatus.scheduled, ExecutionStatus.running] },
        size: MAX_IN_PROGRESS_EXECUTIONS,
      });
    } catch (error) {
      this.deps.logger.warn(`Could not read agent executions: ${errorMessage(error)}`);
      return new Set();
    }

    const ids = new Set<string>();
    for (const execution of executions) {
      if (execution.executionMode !== AgentExecutionMode.conversation) {
        continue;
      }
      if (this.isStale(execution)) {
        continue;
      }
      ids.add(execution.agentParams.conversationId);
    }
    return ids;
  }

  /**
   * A running execution is stale when its last liveness signal is older than
   * {@link STALE_AGENT_HEARTBEAT_MS}. Agent Builder writes a heartbeat when it creates the
   * execution and every 10s while it runs; an execution without one (written before Agent
   * Builder recorded heartbeats) falls back to its creation time, so it cannot read as in
   * progress forever. Scheduled executions are waiting for a node and are not judged here.
   */
  private isStale(execution: AgentExecution): boolean {
    if (execution.status !== ExecutionStatus.running) {
      return false;
    }
    const lastSignalAt = Date.parse(execution.lastHeartbeat ?? execution['@timestamp']);
    return Number.isFinite(lastSignalAt) && this.now() - lastSignalAt > STALE_AGENT_HEARTBEAT_MS;
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
