/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

export const INVESTIGATION_RUN_FAILED_EVENT_TYPE = 'investigation_run_failed' as const;
export const MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH = 10_000;

export const investigationRunFailedEventSchema = lazySchema(() =>
  z.object({
    execution_id: z.string().min(1).max(500),
    request: z.string().min(1).max(MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH).optional(),
    reason: z.string().min(1).max(MAX_INVESTIGATION_RUN_FAILURE_TEXT_LENGTH),
  })
);

export type InvestigationRunFailedEventData = z.infer<typeof investigationRunFailedEventSchema>;
