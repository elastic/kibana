/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGED_OTLP_EXPORTER_DEFAULTS } from '../../../common/constants/output';
import type { OtlpExporterConfig } from '../../../common/types';
import { isManagedOtlpEndpointUrl } from '../../../common/services/managed_otlp_endpoint';

import { appContextService } from '..';

export const getManagedOtlpEndpoint = (): string | undefined => {
  return appContextService.getCloud()?.managedOtlp?.url;
};

export const isManagedOtlpEndpoint = (endpoint: string): boolean =>
  isManagedOtlpEndpointUrl(endpoint, getManagedOtlpEndpoint());

type OtlpSendingQueue = NonNullable<OtlpExporterConfig['sending_queue']>;
type OtlpBatch = NonNullable<OtlpSendingQueue['batch']>;

const QUEUE_DEFAULTS = MANAGED_OTLP_EXPORTER_DEFAULTS.sending_queue;

const isUnset = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

const withManagedBatchDefaults = (batch: OtlpBatch | undefined): OtlpBatch => {
  const sizer = batch?.sizer ?? QUEUE_DEFAULTS.batch.sizer;
  // the recommended sizes are in bytes: a batch that counts items keeps the spec defaults
  const sizesApply = sizer === QUEUE_DEFAULTS.batch.sizer;
  return {
    ...batch,
    flush_timeout: batch?.flush_timeout ?? QUEUE_DEFAULTS.batch.flush_timeout,
    sizer,
    ...(sizesApply && isUnset(batch?.min_size) ? { min_size: QUEUE_DEFAULTS.batch.min_size } : {}),
    ...(sizesApply && isUnset(batch?.max_size) ? { max_size: QUEUE_DEFAULTS.batch.max_size } : {}),
  };
};

/**
 * Fills the settings of the sending queue that are not set, left out or `null`, with the ones that
 * Elastic recommends, when the endpoint is the managed OTLP endpoint. The settings that are set
 * are kept.
 *
 * A `null` block is an explicit opt-out and is kept: `sending_queue: null` leaves the queue to the
 * spec defaults, and `batch: null` turns batching off.
 *
 * The recommended sizes are in bytes, so they are only set for a queue or a batch that counts
 * bytes: a queue that counts requests or items keeps the spec default size.
 */
export const applyManagedOtlpDefaults = (exporter: OtlpExporterConfig): OtlpExporterConfig => {
  if (!isManagedOtlpEndpoint(exporter.endpoint) || exporter.sending_queue === null) {
    return exporter;
  }
  const queue: OtlpSendingQueue = exporter.sending_queue ?? {};
  const sizer = queue.sizer ?? QUEUE_DEFAULTS.sizer;
  return {
    ...exporter,
    sending_queue: {
      ...queue,
      enabled: queue.enabled ?? QUEUE_DEFAULTS.enabled,
      sizer,
      ...(sizer === QUEUE_DEFAULTS.sizer && isUnset(queue.queue_size)
        ? { queue_size: QUEUE_DEFAULTS.queue_size }
        : {}),
      block_on_overflow: queue.block_on_overflow ?? QUEUE_DEFAULTS.block_on_overflow,
      batch: queue.batch === null ? null : withManagedBatchDefaults(queue.batch),
    },
  } as OtlpExporterConfig;
};
