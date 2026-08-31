/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RUN_QUOTA_LEDGER_SO_TYPE, RUN_QUOTA_WORKER_DECISION_SO_TYPE } from './saved_objects';

const RETENTION_PAGE_SIZE = 100;

export type RunQuotaRetentionRepository = Pick<SavedObjectsClientContract, 'delete' | 'find'>;

const drainExpiredType = async ({
  internalRepository,
  type,
  dateField,
  cutoffDay,
  signal,
  maxBatches,
}: {
  internalRepository: RunQuotaRetentionRepository;
  type: string;
  dateField: string;
  cutoffDay: string;
  signal?: AbortSignal;
  maxBatches: number;
}): Promise<{ deleted: number; complete: boolean; batches: number }> => {
  let deleted = 0;
  let batches = 0;

  while (batches < maxBatches && !signal?.aborted) {
    const response = await internalRepository.find({
      type,
      page: 1,
      perPage: RETENTION_PAGE_SIZE,
      filter: `${type}.attributes.${dateField} < "${cutoffDay}"`,
    });
    if (response.saved_objects.length === 0) {
      return { deleted, complete: true, batches };
    }

    await Promise.all(
      response.saved_objects.map((savedObject) => internalRepository.delete(type, savedObject.id))
    );
    deleted += response.saved_objects.length;
    batches += 1;
  }

  return { deleted, complete: false, batches };
};

export const sweepExpiredRunQuotaDocuments = async ({
  internalRepository,
  cutoffDay,
  signal,
  maxBatches = 20,
}: {
  internalRepository: RunQuotaRetentionRepository;
  cutoffDay: string;
  signal?: AbortSignal;
  maxBatches?: number;
}): Promise<{ deleted: number; complete: boolean }> => {
  let remainingBatches = maxBatches;
  let deleted = 0;

  for (const { type, dateField } of [
    { type: RUN_QUOTA_LEDGER_SO_TYPE, dateField: 'date' },
    { type: RUN_QUOTA_WORKER_DECISION_SO_TYPE, dateField: 'ledgerDate' },
  ]) {
    const result = await drainExpiredType({
      internalRepository,
      type,
      dateField,
      cutoffDay,
      signal,
      maxBatches: remainingBatches,
    });
    deleted += result.deleted;
    remainingBatches -= result.batches;
    if (!result.complete) {
      return { deleted, complete: false };
    }
  }

  return { deleted, complete: true };
};

export const deleteExpiredRunQuotaDocuments = async ({
  internalRepository,
  cutoffDay,
}: {
  internalRepository: RunQuotaRetentionRepository;
  cutoffDay: string;
}): Promise<number> => {
  const result = await sweepExpiredRunQuotaDocuments({
    internalRepository,
    cutoffDay,
    maxBatches: Number.POSITIVE_INFINITY,
  });
  return result.deleted;
};
