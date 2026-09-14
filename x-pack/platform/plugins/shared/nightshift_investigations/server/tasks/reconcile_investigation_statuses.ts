/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { Logger } from '@kbn/core/server';
import type { InvestigationStatus } from '../../common';
import {
  EXECUTION_LOOKUP_BATCH_SIZE,
  FALLBACK_ERRORS,
  MAX_CANDIDATES,
  MISSING_EXECUTION_ERROR,
  MISSING_EXECUTION_GRACE_PERIOD_MS,
  NON_TERMINAL_INVESTIGATION_STATUSES,
  PAGE_SIZE,
} from './investigation_reconciliation_types';
import type { ExecutionSummary, ReconciliationResult } from './investigation_reconciliation_types';

export type { ExecutionSummary, ReconciliationResult } from './investigation_reconciliation_types';

/**
 * Minimal record shape returned by the cross-space sweep query.
 * The concrete InvestigationsService satisfies this structurally after the spine adds
 * `findAcrossSpaces` and `updateInSpace` to the shared service (see spine change request).
 */
interface SweepRecord {
  id: string;
  createdAt: string;
  spaceId: string;
}

/**
 * Cross-space operations needed by the reconciliation sweep. These are additions to
 * InvestigationsService requested via the spine change for this leaf.
 */
interface ReconciliationSweepService {
  findAcrossSpaces(query: {
    statuses: readonly InvestigationStatus[];
    sortField: string;
    sortOrder: 'asc' | 'desc';
    page: number;
    size: number;
  }): Promise<{ results: SweepRecord[]; total: number }>;
  updateInSpace(params: {
    id: string;
    spaceId: string;
    patch: {
      status: InvestigationStatus;
      completedAt: string;
      error?: string;
    };
  }): Promise<void>;
}

export interface ReconcileInvestigationStatusesDeps {
  /** Shared investigation service — must satisfy ReconciliationSweepService structurally. */
  investigationsService: ReconciliationSweepService;
  getExecutionSummaries: (
    executionIds: string[],
    spaceId: string
  ) => Promise<ReadonlyMap<string, ExecutionSummary>>;
  logger: Logger;
  signal: AbortSignal;
}

interface ReconciliationOutcome {
  reconciledStatus: InvestigationStatus;
  completedAt: string;
  errorMessage?: string;
}

/**
 * Reads every candidate before any write: patching removes a row from the non-terminal result set
 * and would shift the offsets of pages still to be read.
 */
const getCandidatesBySpace = async ({
  investigationsService,
  signal,
}: Pick<ReconcileInvestigationStatusesDeps, 'investigationsService' | 'signal'>): Promise<{
  bySpace: Map<string, SweepRecord[]>;
  scanned: number;
}> => {
  const candidates: SweepRecord[] = [];
  for (let page = 1; candidates.length < MAX_CANDIDATES; page++) {
    if (signal.aborted) {
      break;
    }

    const { results } = await investigationsService.findAcrossSpaces({
      statuses: [...NON_TERMINAL_INVESTIGATION_STATUSES],
      sortField: 'createdAt',
      sortOrder: 'asc',
      page,
      size: PAGE_SIZE,
    });

    candidates.push(...results.slice(0, MAX_CANDIDATES - candidates.length));

    if (results.length < PAGE_SIZE) {
      break;
    }
  }

  const bySpace = new Map<string, SweepRecord[]>();
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
  investigationsService,
  getExecutionSummaries,
  logger,
  signal,
}: ReconcileInvestigationStatusesDeps): Promise<ReconciliationResult> => {
  const { bySpace, scanned } = await getCandidatesBySpace({
    investigationsService,
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
          batch.map(({ id }) => id),
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

        const { id, createdAt: investigationCreatedAt } = candidate;
        const execution = executions.get(id);
        const outcome = toReconciliationOutcome({ execution, investigationCreatedAt });

        if (!outcome) {
          continue;
        }

        try {
          await investigationsService.updateInSpace({
            id,
            spaceId,
            patch: {
              status: outcome.reconciledStatus,
              completedAt: outcome.completedAt,
              ...(outcome.errorMessage && { error: outcome.errorMessage }),
            },
          });
          reconciled += 1;
          logger.debug(
            `Reconciled investigation "${id}" in space "${spaceId}" to "${
              outcome.reconciledStatus
            }" (execution status: ${execution?.status ?? 'not found'})`
          );
        } catch (error) {
          logger.warn(
            `Failed to reconcile investigation "${id}" in space "${spaceId}": ${error.message}`
          );
        }
      }
    }
  }

  return { scanned, reconciled };
};
