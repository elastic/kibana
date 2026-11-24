/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGED_OTLP_EXPORTER_DEFAULTS } from '../constants/output';
import type { OtlpExporterConfig } from '../types/models/output';

export type OtlpSendingQueue = NonNullable<OtlpExporterConfig['sending_queue']>;
type OtlpBatch = NonNullable<OtlpSendingQueue['batch']>;

const MANAGED_QUEUE = MANAGED_OTLP_EXPORTER_DEFAULTS.sending_queue;

/** The spec defaults of the sending queue, which apply to the settings that are not set. */
export const OTLP_QUEUE_SPEC_DEFAULTS = {
  sizer: 'requests',
  queueSize: 1000,
  blockOnOverflow: false,
  flushTimeout: '200ms',
  minSize: 8192,
  maxSize: 0,
} as const;

const isUnset = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

/**
 * The unit of a batch. With none set it uses the unit of the queue, but a batch can not count
 * requests: it counts items.
 */
export const getOtlpBatchSizer = (batchSizer: string | null | undefined, queueSizer: string) =>
  batchSizer || (queueSizer === 'requests' ? 'items' : queueSizer);

const withManagedBatchDefaults = (
  batch: OtlpBatch | undefined,
  queueSizer: string,
  queueSize: number | null | undefined
): OtlpBatch => {
  const sizer = batch?.sizer ?? MANAGED_QUEUE.batch.sizer;
  const result: OtlpBatch = {
    ...batch,
    flush_timeout: batch?.flush_timeout ?? MANAGED_QUEUE.batch.flush_timeout,
    sizer,
  };
  // the recommended sizes are in bytes: a batch that counts items keeps the spec defaults
  if (sizer !== MANAGED_QUEUE.batch.sizer) {
    return result;
  }

  // a recommended size is only set when it fits with the sizes that are set
  const queueCapacity =
    queueSizer === sizer ? queueSize ?? OTLP_QUEUE_SPEC_DEFAULTS.queueSize : Infinity;
  const maxSize = batch?.max_size;
  if (
    isUnset(batch?.min_size) &&
    MANAGED_QUEUE.batch.min_size <= queueCapacity &&
    (isUnset(maxSize) || maxSize === 0 || maxSize >= MANAGED_QUEUE.batch.min_size)
  ) {
    result.min_size = MANAGED_QUEUE.batch.min_size;
  }
  const minSize = result.min_size ?? OTLP_QUEUE_SPEC_DEFAULTS.minSize;
  if (isUnset(maxSize) && MANAGED_QUEUE.batch.max_size >= minSize) {
    result.max_size = MANAGED_QUEUE.batch.max_size;
  }
  return result;
};

/**
 * The size of a queue of the managed endpoint that is not set. The recommended size is in bytes, so
 * a queue that counts requests or items keeps the spec default, unless a batch in the same unit
 * does not fit in it: the queue then holds one batch of the minimum size.
 */
const getManagedQueueSize = (queue: OtlpSendingQueue | undefined, sizer: string) => {
  if (!isUnset(queue?.queue_size)) {
    return queue?.queue_size;
  }
  if (sizer === MANAGED_QUEUE.sizer) {
    return MANAGED_QUEUE.queue_size;
  }
  const batch = queue?.batch;
  if (batch && (batch.sizer ?? MANAGED_QUEUE.batch.sizer) === sizer) {
    const minSize = batch.min_size ?? OTLP_QUEUE_SPEC_DEFAULTS.minSize;
    if (minSize > OTLP_QUEUE_SPEC_DEFAULTS.queueSize) {
      return minSize;
    }
  }
  return queue?.queue_size;
};

/**
 * Fills the settings of a sending queue of the managed OTLP endpoint that are not set, left out or
 * `null`, with the ones that Elastic recommends. The settings that are set are kept, and a `null`
 * batch is kept: it turns batching off.
 *
 * The recommended sizes are in bytes, so they are only set for a queue or a batch that counts
 * bytes, and only when they fit with the sizes that are set.
 */
export const withManagedOtlpQueueDefaults = (
  queue: OtlpSendingQueue | undefined
): OtlpSendingQueue => {
  const sizer = queue?.sizer ?? MANAGED_QUEUE.sizer;
  const queueSize = getManagedQueueSize(queue, sizer);
  return {
    ...queue,
    enabled: queue?.enabled ?? MANAGED_QUEUE.enabled,
    sizer,
    ...(queueSize !== queue?.queue_size ? { queue_size: queueSize } : {}),
    block_on_overflow: queue?.block_on_overflow ?? MANAGED_QUEUE.block_on_overflow,
    batch: queue?.batch === null ? null : withManagedBatchDefaults(queue?.batch, sizer, queueSize),
  };
};

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
