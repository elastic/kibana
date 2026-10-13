/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

/** Workflow executions read at the same time. */
const WORKFLOW_EXECUTION_READ_CONCURRENCY = 5;

export type InProgressCandidate = Pick<ConversationWithoutRoundsWithPermissions, 'id' | 'metadata'>;

export interface InProgressResolverDeps {
  getWorkflowsManagement: () => WorkflowsServerPluginSetup['management'] | undefined;
  getProposals: () => ProposalsPluginStart | undefined;
  logger: Logger;
}

/**
 * Whether investigations are being worked on: open, with no proposal awaiting a decision, and with
 * at least one of their `workflow_execution_ids` not in a terminal status. Nothing is stored;
 * every read asks again, and only for the investigations being read, because a workflow execution
 * does not name the investigation it works on.
 *
 * Executions and proposals are read without the caller's Workflows or proposals privileges, so
 * only the ids of the investigations in progress leave this module. An execution that cannot be
 * read counts as finished, and any other failed lookup is logged and counts as not in progress:
 * reads must not fail on it.
 */
export class InProgressResolver {
  constructor(private readonly deps: InProgressResolverDeps) {}

  /** The ids of the given investigations that are in progress. */
  async findInProgressIds(
    request: KibanaRequest,
    spaceId: string,
    conversations: InProgressCandidate[]
  ): Promise<Set<string>> {
    const workflowsManagement = this.deps.getWorkflowsManagement();
    const candidates = conversations
      .filter(({ metadata }) => metadata?.status !== 'closed')
      .map(({ id, metadata }) => ({ id, executionIds: toWorkflowExecutionIds(metadata) }))
      .filter(({ executionIds }) => executionIds.length > 0);
    if (!workflowsManagement || candidates.length === 0) {
      return new Set();
    }

    try {
      const pendingProposals = await this.countPendingProposals(
        candidates.map(({ id }) => id),
        spaceId
      );
      const waitingOnWorkers = candidates.filter(({ id }) => !pendingProposals.get(id));
      const running = await this.findRunningExecutionIds(
        workflowsManagement,
        request,
        spaceId,
        waitingOnWorkers.flatMap(({ executionIds }) => executionIds)
      );
      return new Set(
        waitingOnWorkers
          .filter(({ executionIds }) => executionIds.some((id) => running.has(id)))
          .map(({ id }) => id)
      );
    } catch (error) {
      this.deps.logger.warn(`Could not resolve investigations in progress: ${errorMessage(error)}`);
      return new Set();
    }
  }

  /** Whether one investigation is in progress. */
  async isInProgress(
    request: KibanaRequest,
    spaceId: string,
    conversation: InProgressCandidate
  ): Promise<boolean> {
    const ids = await this.findInProgressIds(request, spaceId, [conversation]);
    return ids.has(conversation.id);
  }

  /** Same definition as `pending_proposal_count`, but without the caller's proposals privilege. */
  private async countPendingProposals(
    conversationIds: string[],
    spaceId: string
  ): Promise<Map<string, number>> {
    const proposals = this.deps.getProposals();
    if (!proposals) {
      return new Map();
    }
    return proposals.getProposalsService().countPendingByConversationIds(conversationIds, spaceId);
  }

  private async findRunningExecutionIds(
    workflowsManagement: WorkflowsServerPluginSetup['management'],
    request: KibanaRequest,
    spaceId: string,
    executionIds: string[]
  ): Promise<Set<string>> {
    const limit = pLimit(WORKFLOW_EXECUTION_READ_CONCURRENCY);
    const running = await Promise.all(
      [...new Set(executionIds)].map((id) =>
        limit(async () => {
          try {
            const execution = await workflowsManagement.getWorkflowExecution(id, spaceId, {
              request,
              omitStepExecutions: true,
            });
            return execution && !isTerminalStatus(execution.status) ? id : undefined;
          } catch (error) {
            this.deps.logger.debug(
              `Could not read workflow execution "${id}": ${errorMessage(error)}`
            );
            return undefined;
          }
        })
      )
    );
    return new Set(running.filter((id): id is string => id !== undefined));
  }
}

const toWorkflowExecutionIds = (metadata: InProgressCandidate['metadata']): string[] => {
  const ids = metadata?.workflow_execution_ids;
  return Array.isArray(ids) ? ids.filter((id) => id.length > 0) : [];
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
