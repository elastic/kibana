/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { WorkerRunBudgetGroupId } from '../../../common/run_quotas';
import {
  RUN_QUOTA_WORKER_DECISION_SO_TYPE,
  type RunQuotaWorkerDecisionAttributes,
} from './saved_objects';
import type { RunQuotaSavedObjectsRepository } from './repository';

const MAX_OCC_ATTEMPTS = 100;

export const getRunQuotaWorkerDecisionId = (grantKey: string): string =>
  createHash('sha256').update(grantKey).digest('hex');

const readDecision = async (internalRepository: RunQuotaSavedObjectsRepository, id: string) => {
  try {
    return await internalRepository.get<RunQuotaWorkerDecisionAttributes>(
      RUN_QUOTA_WORKER_DECISION_SO_TYPE,
      id
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return undefined;
    }
    throw error;
  }
};

export const getOrCreatePendingWorkerDecision = async ({
  internalRepository,
  group,
  grantKey,
  executionId,
  ledgerDate,
  limitSnapshot,
  createdAt,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: WorkerRunBudgetGroupId;
  grantKey: string;
  executionId: string;
  ledgerDate: string;
  limitSnapshot: number;
  createdAt: string;
}): Promise<RunQuotaWorkerDecisionAttributes> => {
  const id = getRunQuotaWorkerDecisionId(grantKey);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    const existing = await readDecision(internalRepository, id);
    if (existing) {
      return existing.attributes;
    }

    const pending: RunQuotaWorkerDecisionAttributes = {
      ledgerDate,
      group,
      grantKey,
      latestExecutionId: executionId,
      state: 'pending',
      limitSnapshot,
      createdAt,
    };

    try {
      const savedObject = await internalRepository.create<RunQuotaWorkerDecisionAttributes>(
        RUN_QUOTA_WORKER_DECISION_SO_TYPE,
        pending,
        { id, overwrite: false }
      );
      return { ...pending, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota worker decision could not be created after repeated conflicts');
};

export const finalizeWorkerDecision = async ({
  internalRepository,
  grantKey,
  executionId,
  allowed,
  decidedAt,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  grantKey: string;
  executionId: string;
  allowed: boolean;
  decidedAt: string;
}): Promise<RunQuotaWorkerDecisionAttributes> => {
  const id = getRunQuotaWorkerDecisionId(grantKey);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    const currentSavedObject = await readDecision(internalRepository, id);
    if (!currentSavedObject) {
      throw new Error('Pending run quota worker decision is missing');
    }
    const current = currentSavedObject.attributes;
    if (current.state !== 'pending') {
      return current;
    }
    const next: RunQuotaWorkerDecisionAttributes = {
      ...current,
      latestExecutionId: executionId,
      state: allowed ? 'allowed' : 'denied',
      decidedAt,
    };

    try {
      const savedObject = await internalRepository.update<RunQuotaWorkerDecisionAttributes>(
        RUN_QUOTA_WORKER_DECISION_SO_TYPE,
        id,
        next,
        { version: currentSavedObject.version }
      );
      return { ...next, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota worker decision could not be finalized after repeated conflicts');
};
