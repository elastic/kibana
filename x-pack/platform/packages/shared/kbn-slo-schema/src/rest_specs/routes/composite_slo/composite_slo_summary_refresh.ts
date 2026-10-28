/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

const postCompositeSloSummaryRefreshParamsSchema = lazySchema(() => z.object({}));

export type CompositeSloSummaryRefreshSkippedReason =
  | 'task_disabled'
  | 'cooldown'
  | 'task_not_scheduled'
  | 'already_running'
  | 'run_soon_failed';

export type PostCompositeSloSummaryRefreshResponse =
  | { readonly triggered: true }
  | { readonly triggered: false; readonly reason: CompositeSloSummaryRefreshSkippedReason };

export { postCompositeSloSummaryRefreshParamsSchema };
