/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeCasesRequest, MergeCasesResponse } from '../../../../../common/types/api';
import {
  INTERNAL_MERGE_CASES_URL,
  MAX_CASES_TO_MERGE,
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
  routerOptions: {
    access: 'internal',
    summary: 'Merge cases',
    description: `Merges ${MIN_CASES_TO_MERGE} to ${MAX_CASES_TO_MERGE} cases from the same solution into a new case, or into one of them when \`destinationCaseId\` is set. Alerts, events, observables, and other attachments are copied into the destination case; comments and files stay on the original cases. The original cases are marked as merged and, when \`closeOriginals\` is true, closed without changing the status of their alerts. Nothing changes if the destination case is closed or a per-case attachment limit would be exceeded; to stay within a limit, pass keys from the merge preview in \`excludedAttachments\`. Steps that fail after the destination case is created or updated are listed in \`failures\` and are not rolled back. You must have privileges to create cases (for a new destination case), update cases, and add comments for the solution the cases belong to.`,
    tags: ['oas-tag:cases'],
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
