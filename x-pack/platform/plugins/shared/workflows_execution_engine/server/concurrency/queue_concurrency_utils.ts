/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcurrencySettings, EsWorkflowExecution } from '@kbn/workflows';
import { DEFAULT_CONCURRENCY_QUEUE_TTL, parseDuration } from '@kbn/workflows';

export const resolveQueueTtlSetting = (concurrencySettings?: ConcurrencySettings): string =>
  concurrencySettings?.['queue-ttl'] ?? DEFAULT_CONCURRENCY_QUEUE_TTL;

export const resolveQueueTtlMs = (concurrencySettings?: ConcurrencySettings): number =>
  parseDuration(resolveQueueTtlSetting(concurrencySettings));

export const getQueueWaitDeadlineMs = (
  execution: Pick<EsWorkflowExecution, 'createdAt'>,
  concurrencySettings?: ConcurrencySettings
): number => new Date(execution.createdAt).getTime() + resolveQueueTtlMs(concurrencySettings);
