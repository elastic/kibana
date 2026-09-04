/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { InvestigationStatus } from '../../common';
import { InvestigationStaleWriteError } from '../storage';
import type { InvestigationPatch } from '../storage';
import {
  EXECUTION_LOOKUP_BATCH_SIZE,
  FALLBACK_ERRORS,
  MAX_CANDIDATES,
  MISSING_EXECUTION_ERROR,
  MISSING_EXECUTION_GRACE_PERIOD_MS,
  NON_TERMINAL_INVESTIGATION_STATUSES,
  PAGE_SIZE,
} from './investigation_reconciliation_types';
import type {
  ExecutionSummary,
  ReconcileInvestigationStatusesDeps,
  ReconciliationCandidate,
  ReconciliationOutcome,
  ReconciliationResult,
} from './investigation_reconciliation_types';

export type {
  ExecutionSummary,
  ReconcileInvestigationStatusesDeps,
  ReconciliationResult,
} from './investigation_reconciliation_types';

/**
 * Reads every candidate before any write: patching removes a row from the non-terminal result set
 * and would shift the offsets of pages still to be read.
 */
const getCandidatesBySpace = async ({
  investigationSweepRepository,
  signal,
}: Pick<ReconcileInvestigationStatusesDeps, 'investigationSweepRepository' | 'signal'>): Promise<{
  bySpace: Map<string, ReconciliationCandidate[]>;
  scanned: number;
}> => {
  const candidates: ReconciliationCandidate[] = [];
  for (let page = 1; candidates.length < MAX_CANDIDATES; page++) {
    if (signal.aborted) {
      break;
    }

    const { results } = await investigationSweepRepository.findAcrossSpaces({
      statuses: [...NON_TERMINAL_INVESTIGATION_STATUSES],
      fields: ['created_at'],
      sortField: 'created_at',
      sortOrder: 'asc',
      page,
      perPage: PAGE_SIZE,
    });

    candidates.push(...results.slice(0, MAX_CANDIDATES - candidates.length));

    if (results.length < PAGE_SIZE) {
      break;
    }
  }

  const bySpace = new Map<string, ReconciliationCandidate[]>();
  for (const candidate of candidates) {
    const spaceCandidates = bySpace.get(candidate.spaceId);
    if (spaceCandidates) {
      spaceCandidates.push(candidate);
    } else {
      bySpace.set(candidate.spaceId, [candidate]);
    }
  }
  return { bySpace, scanned: candidates.length };
};

const toInvestigationStatus = (
  executionStatus: ExecutionStatus
): InvestigationStatus | undefined => {
  switch (executionStatus) {
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return undefined;
    default: {
      const unhandled: never = executionStatus;
      throw new Error(`Unhandled workflow execution status: ${String(unhandled)}`);
    }
  }
};

const toReconciliationOutcome = ({
  execution,
  investigationCreatedAt,
}: {
  execution: ExecutionSummary | undefined;
  investigationCreatedAt: string;
}): ReconciliationOutcome | undefined => {
  if (execution) {
    const reconciledStatus = toInvestigationStatus(execution.status);
    if (!reconciledStatus) {
      return undefined;
    }
    return {
      reconciledStatus,
      completedAt: execution.finishedAt ?? new Date().toISOString(),
      ...(reconciledStatus === 'failed' && {
        errorMessage: execution.error?.message ?? FALLBACK_ERRORS[execution.status],
      }),
    };
  }

  const createdAtMs = Date.parse(investigationCreatedAt);
  if (isNaN(createdAtMs) || Date.now() - createdAtMs < MISSING_EXECUTION_GRACE_PERIOD_MS) {
    return undefined;
  }
  return {
    reconciledStatus: 'failed',
    completedAt: new Date().toISOString(),
    errorMessage: MISSING_EXECUTION_ERROR,
  };
};

/**
 * Corrects investigations left in a non-terminal status by a workflow execution that has already
 * settled — the engine cancels or times out a run before its `persist_investigation_*` step can
 * write the outcome. Only the status is corrected; no lifecycle trigger is emitted.
 */
export const reconcileInvestigationStatuses = async ({
  investigationSweepRepository,
  getExecutionSummaries,
  logger,
  signal,
}: ReconcileInvestigationStatusesDeps): Promise<ReconciliationResult> => {
  const { bySpace, scanned } = await getCandidatesBySpace({
    investigationSweepRepository,
    signal,
  });

  let reconciled = 0;

  for (const [spaceId, spaceCandidates] of bySpace) {
    for (let start = 0; start < spaceCandidates.length; start += EXECUTION_LOOKUP_BATCH_SIZE) {
      if (signal.aborted) {
        return { scanned, reconciled };
      }

      const batch = spaceCandidates.slice(start, start + EXECUTION_LOOKUP_BATCH_SIZE);

      let executions: ReadonlyMap<string, ExecutionSummary>;
      try {
        executions = await getExecutionSummaries(
          batch.map(({ investigation }) => investigation.id),
          spaceId
        );
      } catch (error) {
        // Not treated as "these executions are missing": that would settle healthy investigations
        // as failed once they aged past the grace period. The next run retries.
        logger.warn(`Failed to read workflow executions in space "${spaceId}": ${error.message}`);
        continue;
      }

      for (const candidate of batch) {
        if (signal.aborted) {
          return { scanned, reconciled };
        }

        const { id, version, created_at: investigationCreatedAt } = candidate.investigation;
        const execution = executions.get(id);
        const outcome = toReconciliationOutcome({ execution, investigationCreatedAt });

        if (!outcome) {
          continue;
        }

        const patch: InvestigationPatch = {
          status: outcome.reconciledStatus,
          completed_at: outcome.completedAt,
          ...(outcome.errorMessage && { error: outcome.errorMessage }),
        };

        try {
          await investigationSweepRepository.updateInSpace({ id, spaceId, patch, version });
          reconciled += 1;
          logger.debug(
            `Reconciled investigation "${id}" in space "${spaceId}" to "${
              outcome.reconciledStatus
            }" (execution status: ${execution?.status ?? 'not found'})`
          );
        } catch (error) {
          if (error instanceof InvestigationStaleWriteError) {
            // Something else settled the investigation between the read and the write.
            continue;
          }
          logger.warn(
            `Failed to reconcile investigation "${id}" in space "${spaceId}": ${error.message}`
          );
        }
      }
    }
  }

  return { scanned, reconciled };
};
