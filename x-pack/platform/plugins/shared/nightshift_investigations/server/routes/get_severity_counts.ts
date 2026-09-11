/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  INVESTIGATION_STATUSES,
  INVESTIGATION_SUBJECT_TYPES,
  MAX_KEYWORD_LENGTH,
  type SeverityCountsResponse,
} from '../../common';
import type { SeverityCountsQuery } from '../storage/types';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { type Complete, assertAllFieldsMapped } from './mapper_types';

const severityCountsQuerySchema = z.object({
  statuses: z
    .union([z.enum(INVESTIGATION_STATUSES), z.array(z.enum(INVESTIGATION_STATUSES)).max(5)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  subject_types: z
    .union([
      z.enum(INVESTIGATION_SUBJECT_TYPES),
      z.array(z.enum(INVESTIGATION_SUBJECT_TYPES)).max(2),
    ])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  query: z.string().max(MAX_KEYWORD_LENGTH).optional(),
  concurrency_key: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional(),
  created_after: z.string().max(100).datetime({ offset: true }).optional(),
  created_before: z.string().max(100).datetime({ offset: true }).optional(),
  started_after: z.string().max(100).datetime({ offset: true }).optional(),
  started_before: z.string().max(100).datetime({ offset: true }).optional(),
  completed_after: z.string().max(100).datetime({ offset: true }).optional(),
  completed_before: z.string().max(100).datetime({ offset: true }).optional(),
});

export const toSeverityCountsArgs = ({
  statuses,
  subject_types: subjectTypes,
  query,
  concurrency_key: concurrencyKey,
  created_after: createdAfter,
  created_before: createdBefore,
  started_after: startedAfter,
  started_before: startedBefore,
  completed_after: completedAfter,
  completed_before: completedBefore,
  ...rest
}: z.infer<typeof severityCountsQuerySchema>): Complete<SeverityCountsQuery> => {
  assertAllFieldsMapped(rest);
  return {
    statuses,
    subjectTypes,
    query,
    concurrencyKey,
    createdAfter,
    createdBefore,
    startedAfter,
    startedBefore,
    completedAfter,
    completedBefore,
  };
};

/**
 * Severity facet counts, split out from the list route.
 *
 * The counts are independent of pagination and sort, so serving them alongside the list would
 * recompute an identical aggregation on every page change. Keeping them separate also lets the
 * list render before the counts arrive.
 *
 * Deliberately accepts no `severities` param: the counts say how many investigations sit in each
 * tier under the *other* filters, so narrowing by tier would make them self-referential.
 */
export const getSeverityCountsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/_severity_counts',
  options: {
    access: 'internal',
    summary: 'Investigation counts by severity',
    description:
      'Returns the number of investigations at each severity tier, zero-filled for all four tiers.',
  },
  security: {
    // agentBuilder:read as a proxy for AI feature access. See start_investigation.ts.
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    query: severityCountsQuerySchema,
  }),
  handler: async ({ request, params, getInvestigationsClient }): Promise<SeverityCountsResponse> => {
    const client = getInvestigationsClient(request);
    const severityCounts = await client.getSeverityCounts(toSeverityCountsArgs(params.query));
    return { severity_counts: severityCounts };
  },
});
