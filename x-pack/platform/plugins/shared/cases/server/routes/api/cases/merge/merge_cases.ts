/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../../../common/types/api';
import { MergeCasesRequestSchema } from '../../../../../common/types/api';
import {
  INTERNAL_MERGE_CASES_URL,
  MAX_CASES_TO_MERGE,
  MERGE_CASES_API_VERSION,
  MERGE_CASES_MAX_BODY_BYTES,
  MIN_CASES_TO_MERGE,
} from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';

/**
 * POST /internal/cases/_merge
 * Shaped like the public Cases routes so it can move to `/api/cases/_merge` as is.
 */
export const mergeCasesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_MERGE_CASES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  version: MERGE_CASES_API_VERSION,
  params: {
    body: buildRouteValidationWithZod(MergeCasesRequestSchema),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Merge cases',
    description: `Merges ${MIN_CASES_TO_MERGE} to ${MAX_CASES_TO_MERGE} cases from the same solution into a new case, or into an open one of them when \`destinationCaseId\` is set. Alerts, events, attacks, observables, and other attachments are copied into the destination case, skipping what it already holds; comments and files stay on the source cases. Every source case whose items were all copied links to the destination and, unless \`closeSources\` is false, is closed without a close reason and without changing the status of its alerts. The merge is refused, with nothing changed, while a field the cases hold different values for has no value in \`fields\`, or a per-case limit would be exceeded; the 400 response lists every conflict and limit. Each source's result has an \`outcome\` of \`merged\` or \`notMerged\`: the response is 200 even when a source is not merged, and running the same merge again finishes it. You must have privileges to create cases (for a new destination case), update cases, and add comments for the solution the cases belong to.`,
    tags: ['oas-tag:cases'],
    body: { maxBytes: MERGE_CASES_MAX_BODY_BYTES },
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const params = request.body as MergeCasesRequest;

      const res: MergeCasesResponse = await casesClient.cases.merge(params);

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to merge cases in route: ${error}`,
        error,
      });
    }
  },
});
