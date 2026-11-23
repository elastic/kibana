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
  /**
   * A KQL date. If used all cases created after (gte) the from date will be returned
   */
  from: z.string().optional(),
  /**
   * A KQL date. If used all cases created before (lte) the to date will be returned.
   */
  to: z.string().optional(),
  /**
   * The owner of the cases to retrieve the status stats from. If no owner is provided the stats for all cases
   * that the user has access to will be returned.
   */
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export type CasesStatusResponse = z.infer<typeof CasesStatusResponseSchema>;
export type CasesStatusRequest = z.infer<typeof CasesStatusRequestSchema>;
