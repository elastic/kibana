/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/core/server';

export const MAX_BULK_WRITE_ITEMS = 100;

export interface CompactBulkError {
  type: string;
  reason: string;
  status?: number;
}

export type BulkWriteErrorCode = 'validation_error' | 'outcome_unknown' | 'bulk_error';

export class BulkWriteError extends Error {
  constructor(public readonly code: BulkWriteErrorCode, message: string) {
    super(message);
    this.name = 'BulkWriteError';
  }
}

export const createBulkWriteValidationError = (message: string): BulkWriteError =>
  new BulkWriteError('validation_error', message);

export const createBulkWriteOutcomeUnknownError = (message: string): BulkWriteError =>
  new BulkWriteError('outcome_unknown', message);

export const createBulkWriteItemError = (error: CompactBulkError): BulkWriteError =>
  new BulkWriteError('bulk_error', `${error.type}: ${error.reason}`);

export type BulkWriteToolErrorCode = 'validation_error' | 'outcome_unknown' | 'pre_write_error';

export const getBulkWriteToolErrorCode = (error: Error): BulkWriteToolErrorCode => {
  if (
    error instanceof BulkWriteError &&
    (error.code === 'validation_error' || error.code === 'outcome_unknown')
  ) {
    return error.code;
  }
  return 'pre_write_error';
};

export const trackTelemetryBestEffort = ({
  track,
  logger,
  description,
}: {
  track: () => void;
  logger: Logger;
  description: string;
}): void => {
  try {
    track();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown telemetry error';
    logger.warn(`Failed to track ${description}: ${message}`);
  }
};

export const assertValidBulkWriteSize = (items: readonly object[]): void => {
  if (items.length < 1 || items.length > MAX_BULK_WRITE_ITEMS) {
    throw createBulkWriteValidationError(
      `Expected between 1 and ${MAX_BULK_WRITE_ITEMS} items, received ${items.length}`
    );
  }
};

export const assertUniqueBulkWriteKeys = (
  entries: Array<{ index: number; key: string }>,
  keyName: string
): void => {
  const indicesByKey = new Map<string, number[]>();
  for (const { index, key } of entries) {
    const indices = indicesByKey.get(key) ?? [];
    indices.push(index);
    indicesByKey.set(key, indices);
  }

  const duplicates = [...indicesByKey.entries()].filter(([, indices]) => indices.length > 1);
  if (duplicates.length === 0) {
    return;
  }

  const details = duplicates
    .map(
      ([key, indices]) =>
        `${keyName} ${JSON.stringify(key)} at ${indices.map((i) => `items[${i}]`).join(', ')}`
    )
    .join('; ');
  throw createBulkWriteValidationError(`Duplicate bulk write keys: ${details}`);
};

export const toCompactBulkError = (detail: BulkResponseItem): CompactBulkError => ({
  type: detail.error?.type ?? 'unknown_bulk_error',
  reason: detail.error?.reason ?? 'Elasticsearch rejected the bulk item',
  status: detail.status,
});
