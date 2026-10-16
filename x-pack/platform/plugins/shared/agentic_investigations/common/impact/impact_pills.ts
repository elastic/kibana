/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { proposalOriginSchema } from '@kbn/proposals-common';
import type { ImpactPill } from '@kbn/agentic-investigations-common';

export interface ImpactPillsResponse {
  pills: ImpactPill[];
}

const MAX_PILL_QUERY_STRING_LENGTH = 64;
const MAX_PILL_CATEGORIES = 10;
const MAX_DECIDED_WITHIN_HOURS = 168;

const stringList = z
  .union([
    z.string().min(1).max(MAX_PILL_QUERY_STRING_LENGTH),
    z.array(z.string().min(1).max(MAX_PILL_QUERY_STRING_LENGTH)).min(1).max(MAX_PILL_CATEGORIES),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));

/**
 * Which proposals form the queue the pills describe: the open ones of `categories`, plus those
 * decided within `decidedWithinHours` when given.
 */
export const proposalImpactPillsQuerySchema = z.object({
  origin: proposalOriginSchema,
  categories: stringList,
  decidedWithinHours: z.coerce.number().int().min(1).max(MAX_DECIDED_WITHIN_HOURS).optional(),
});
export type ProposalImpactPillsQuery = z.infer<typeof proposalImpactPillsQuerySchema>;
