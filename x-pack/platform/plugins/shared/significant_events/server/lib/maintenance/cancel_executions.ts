/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { MaintenanceWorkflowTarget } from './managed_workflow_targets';
import { toMessage } from './to_message';

type ManagementApi = WorkflowsServerPluginSetup['management'];

const RUNNING_EXECUTIONS_PAGE_SIZE = 1000;
/** Caps cancel rounds that re-query page 1 after each batch (status lag). */
const MAX_CANCEL_ROUNDS = 50;

/**
 * Cancel every in-flight (non-terminal) execution of one workflow document in
 * one space. Uses a two-pass drain: pass 1 pages forward through the known
 * backlog, pass 2 re-checks page 1 for ids that surfaced late due to status
 * lag. Tracks attempted ids to avoid re-cancelling the same execution and caps
 * the re-check loop with {@link MAX_CANCEL_ROUNDS}. Returns the number of
 * executions actually cancelled; records a backlog failure only when cancels
 * genuinely failed and the ids remain.
 */
export const cancelTargetExecutions = async (
  mgmt: ManagementApi,
  { id, spaceId }: MaintenanceWorkflowTarget,
  request: KibanaRequest,
  failures: SignificantEventsMaintenanceFailure[]
): Promise<number> => {
  try {
    let cancelled = 0;
    const attemptedIds = new Set<string>();
    const failedCancelIds = new Set<string>();

    const cancelBatch = async (executions: Array<{ id: string }>): Promise<number> => {
      const pending = executions.filter((execution) => !attemptedIds.has(execution.id));
      if (pending.length === 0) {
        return 0;
      }
      for (const execution of pending) {
        attemptedIds.add(execution.id);
      }
      const outcomes = await Promise.all(
        pending.map((execution) =>
          mgmt.cancelWorkflowExecution(execution.id, spaceId, request).then(
            () => true,
            (error) => {
              failedCancelIds.add(execution.id);
              failures.push({
                target: `execution:${execution.id}@${spaceId}`,
                error: toMessage(error),
              });
              return false;
            }
          )
        )
      );
      return outcomes.filter(Boolean).length;
    };

    const recordBacklogIfStuck = (results: Array<{ id: string }>, detail: string): void => {
      // Successful cancels may still appear briefly (status lag). Only surface a
      // backlog failure when cancels actually failed and those ids remain.
      const stuckFailed = results.filter((execution) => failedCancelIds.has(execution.id));
      if (stuckFailed.length === 0) {
        return;
      }
      failures.push({
        target: `execution-backlog:${id}@${spaceId}`,
        error: `${detail}: ${stuckFailed.length} non-terminal execution(s) remain after failed cancel`,
      });
    };

    // Pass 1: page forward through the known backlog.
    for (let page = 1; ; page++) {
      const { results, total } = await mgmt.getWorkflowExecutions(
        {
          workflowId: id,
          statuses: [...NonTerminalExecutionStatuses],
          page,
          size: RUNNING_EXECUTIONS_PAGE_SIZE,
        },
        spaceId
      );
      if (results.length === 0) {
        break;
      }
      cancelled += await cancelBatch(results);
      if (
        results.length < RUNNING_EXECUTIONS_PAGE_SIZE ||
        page * RUNNING_EXECUTIONS_PAGE_SIZE >= total
      ) {
        break;
      }
    }

    // Pass 2: re-check page 1 for any ids that were not seen in pass 1 (e.g.
    // status lag left earlier pages non-empty while newer work was queued).
    // Attempted-id tracking prevents infinite re-cancels of the same execution.
    let rounds = 0;
    for (; rounds < MAX_CANCEL_ROUNDS; rounds++) {
      const { results } = await mgmt.getWorkflowExecutions(
        {
          workflowId: id,
          statuses: [...NonTerminalExecutionStatuses],
          page: 1,
          size: RUNNING_EXECUTIONS_PAGE_SIZE,
        },
        spaceId
      );
      const accepted = await cancelBatch(results);
      if (accepted === 0) {
        recordBacklogIfStuck(results, 'Cancel backlog not drained');
        break;
      }
      cancelled += accepted;
    }

    if (rounds >= MAX_CANCEL_ROUNDS) {
      const { results } = await mgmt.getWorkflowExecutions(
        {
          workflowId: id,
          statuses: [...NonTerminalExecutionStatuses],
          page: 1,
          size: RUNNING_EXECUTIONS_PAGE_SIZE,
        },
        spaceId
      );
      recordBacklogIfStuck(results, `Cancel backlog not drained after ${MAX_CANCEL_ROUNDS} rounds`);
    }

    return cancelled;
  } catch (error) {
    failures.push({ target: `execution:${id}@${spaceId}`, error: toMessage(error) });
    return 0;
  }
};
