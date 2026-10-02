/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution, ExecutionStart } from '@kbn/agent-builder-server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  INVESTIGATION_CONCURRENCY_KEY_PREFIX,
  parseInvestigationConcurrencyKey,
  type InvestigationDriverWorkflowRegistry,
} from './driver_workflows';

/** Ceiling on executions one lookup reads, from Agent Builder and from each driver workflow. */
export const MAX_IN_PROGRESS_EXECUTIONS = 1000;

/**
 * A running agent execution whose node has not reported liveness for this long is treated as
 * dead. Agent Builder writes a heartbeat every 10s and its followers time out after 60s; this is
 * deliberately looser so a slow node does not flip an investigation out of progress. Agent
 * Builder exports no constant for it.
 */
export const STALE_AGENT_HEARTBEAT_MS = 5 * 60 * 1000;

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export interface InProgressResolverDeps {
  getAgentExecutions: () => ExecutionStart;
  /** Undefined when the workflowsManagement plugin is not installed: only agent runs count. */
  getWorkflowsManagement: () => WorkflowsManagementApi | undefined;
  driverWorkflows: InvestigationDriverWorkflowRegistry;
  logger: Logger;
  now?: () => number;
}

/**
 * Whether an investigation is being worked on: the union of (A) scheduled or running Agent
 * Builder executions of its conversation and (B) non-terminal executions of a registered driver
 * workflow whose concurrency group key names it. Nothing is stored; every read asks again.
 *
 * Agent executions are read without an access check (Agent Builder scopes them to the space
 * only), so only conversation ids leave this module, and callers intersect them with
 * access-checked conversation reads. Driver workflow executions are read as the caller, so a
 * caller who cannot read the workflow does not see its executions. A failed lookup is logged and
 * counts as not in progress: reads must not fail on it.
 */
export class InProgressResolver {
  private readonly now: () => number;

  constructor(private readonly deps: InProgressResolverDeps) {
    this.now = deps.now ?? Date.now;
  }

  /** Conversation ids in progress in the space. */
  async findInProgressIds(request: KibanaRequest, spaceId: string): Promise<Set<string>> {
    const [agentIds, workflowIds] = await Promise.all([
      this.findAgentRunConversationIds(request, spaceId),
      this.findDriverWorkflowInvestigationIds(request, spaceId),
    ]);
    return new Set([...agentIds, ...workflowIds]);
  }

  /** Whether one investigation is in progress. */
  async isInProgress(
    request: KibanaRequest,
    spaceId: string,
    conversationId: string
  ): Promise<boolean> {
    const agentIds = await this.findAgentRunConversationIds(request, spaceId);
    if (agentIds.has(conversationId)) {
      return true;
    }
    const workflowIds = await this.findDriverWorkflowInvestigationIds(
      request,
      spaceId,
      `${INVESTIGATION_CONCURRENCY_KEY_PREFIX}${conversationId}`
    );
    return workflowIds.has(conversationId);
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

  private isStale({ status, lastHeartbeat }: AgentExecution): boolean {
    if (status !== ExecutionStatus.running || lastHeartbeat === undefined) {
      return false;
    }
    const heartbeatAt = Date.parse(lastHeartbeat);
    return Number.isFinite(heartbeatAt) && this.now() - heartbeatAt > STALE_AGENT_HEARTBEAT_MS;
  }

  /**
   * One query per registered driver workflow: the executions API filters a single workflow id,
   * and its concurrency key filter is an exact term, so the bulk lookup parses the key instead.
   */
  private async findDriverWorkflowInvestigationIds(
    request: KibanaRequest,
    spaceId: string,
    concurrencyGroupKey?: string
  ): Promise<Set<string>> {
    const management = this.deps.getWorkflowsManagement();
    const workflowIds = this.deps.driverWorkflows.list();
    if (!management || workflowIds.length === 0) {
      return new Set();
    }

    const results = await Promise.all(
      workflowIds.map(async (workflowId) => {
        try {
          const { results: executions } = await management.getWorkflowExecutions(
            {
              workflowId,
              statuses: [...NonTerminalExecutionStatuses],
              concurrencyGroupKey,
              omitStepRuns: true,
              size: concurrencyGroupKey ? 1 : MAX_IN_PROGRESS_EXECUTIONS,
              request,
            },
            spaceId
          );
          return executions.map((execution) =>
            parseInvestigationConcurrencyKey(execution.concurrencyGroupKey)
          );
        } catch (error) {
          this.deps.logger.warn(
            `Could not read executions of investigation workflow ${workflowId}: ${errorMessage(
              error
            )}`
          );
          return [];
        }
      })
    );

    return new Set(results.flat().filter((id): id is string => id !== undefined));
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
