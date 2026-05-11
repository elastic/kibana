/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const CasesStatusResponseSchema = z.object({
  count_open_cases: z.number(),
  count_in_progress_cases: z.number(),
  count_closed_cases: z.number(),
});

export const CasesStatusRequestSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export type CasesStatusResponse = z.infer<typeof CasesStatusResponseSchema>;
export type CasesStatusRequest = z.infer<typeof CasesStatusRequestSchema>;
