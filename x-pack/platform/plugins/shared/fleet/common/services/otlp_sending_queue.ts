/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtlpExporterConfig } from '../types/models/output';

export type OtlpSendingQueue = NonNullable<OtlpExporterConfig['sending_queue']>;

/** The spec defaults of the sending queue, which apply to the settings that are not set. */
export const OTLP_QUEUE_SPEC_DEFAULTS = {
  sizer: 'requests',
  queueSize: 1000,
  blockOnOverflow: false,
  flushTimeout: '200ms',
  minSize: 8192,
  maxSize: 0,
} as const;

/**
 * The unit of a batch. With none set it uses the unit of the queue, but a batch can not count
 * requests: it counts items.
 */
export const getOtlpBatchSizer = (batchSizer: string | null | undefined, queueSizer: string) =>
  batchSizer || (queueSizer === 'requests' ? 'items' : queueSizer);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Merges an update into a stored value as a saved object update does: a non-empty object is merged
 * into the stored one, a setting that is left out keeps its stored value, and any other value,
 * `null` and an empty object included, replaces the stored one.
 */
const mergeAsSavedObjectUpdate = (stored: unknown, update: unknown): unknown => {
  if (update === undefined) {
    return stored;
  }
  if (!isPlainObject(update) || !Object.keys(update).length || !isPlainObject(stored)) {
    return update;
  }
  const merged: Record<string, unknown> = { ...stored };
  Object.entries(update).forEach(([key, value]) => {
    merged[key] = mergeAsSavedObjectUpdate(stored[key], value);
  });
  return merged;
};

/** The sending queue that an output has once an update of it is merged into the stored one. */
export const mergeOtlpSendingQueue = (
  stored: OtlpSendingQueue | null | undefined,
  update: OtlpSendingQueue | null | undefined
) => mergeAsSavedObjectUpdate(stored, update) as OtlpSendingQueue | null | undefined;

/**
 * An update that writes a value in place of a stored one, as a saved object update merges it: the
 * stored settings that the value does not have are set to `null`.
 */
export const withRemovedStoredSettings = (value: unknown, stored: unknown): unknown => {
  if (!isPlainObject(value) || !isPlainObject(stored)) {
    return value;
  }
  const result: Record<string, unknown> = { ...value };
  Object.keys(stored).forEach((key) => {
    result[key] = key in value ? withRemovedStoredSettings(value[key], stored[key]) : null;
  });
  return result;
};

const withoutNullKeys = <T extends object>(value: T, keys: Array<keyof T>): T =>
  Object.fromEntries(
    Object.entries(value).filter(([key, v]) => !(keys.includes(key as keyof T) && v === null))
  ) as T;

/**
 * A stored sending queue without the `null` that an update writes to remove a setting that only
 * takes a value, so that a setting that is not set is left out of the output, as it was before
 * the update. The `null` of a block is kept: it is an opt-out.
 */
export const omitRemovedOtlpQueueSettings = <T extends OtlpSendingQueue | null | undefined>(
  queue: T
): T => {
  if (!queue) {
    return queue;
  }
  const result = withoutNullKeys(queue as OtlpSendingQueue, [
    'enabled',
    'sizer',
    'wait_for_result',
    'block_on_overflow',
  ]);
  if (result.batch) {
    result.batch = withoutNullKeys(result.batch, ['sizer']);
  }
  return result as T;
};

/**
 * The error of the sizes of a sending queue that the collector rejects, with the spec defaults for
 * the sizes that are not set: a minimum batch size that does not fit in the queue when both use the
 * same unit, or a maximum batch size below the minimum.
 */
export const getOtlpSendingQueueSizeError = (
  queue: OtlpSendingQueue | null | undefined
): string | undefined => {
  const batch = queue?.batch;
  // the collector does not check a queue that is off, nor a queue without batching
  if (!queue || queue.enabled === false || !batch) {
    return;
  }
  const queueSizer = queue.sizer ?? OTLP_QUEUE_SPEC_DEFAULTS.sizer;
  const queueSize = queue.queue_size ?? OTLP_QUEUE_SPEC_DEFAULTS.queueSize;
  const minSize = batch.min_size ?? OTLP_QUEUE_SPEC_DEFAULTS.minSize;
  const maxSize = batch.max_size ?? OTLP_QUEUE_SPEC_DEFAULTS.maxSize;
  if (getOtlpBatchSizer(batch.sizer, queueSizer) === queueSizer && minSize > queueSize) {
    return `sending_queue.batch.min_size (${minSize}) can not be more than sending_queue.queue_size (${queueSize}) when both use the same unit`;
  }
  if (maxSize !== 0 && maxSize < minSize) {
    return `sending_queue.batch.max_size (${maxSize}) can not be less than sending_queue.batch.min_size (${minSize}), unless it is 0`;
  }
};
