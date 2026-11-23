/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type {
  MergeCasesResolveRequest,
  MergeCasesResolveResponse,
} from '../../../../../common/types/api';
import { MergeCasesResolveRequestSchema } from '../../../../../common/types/api';
import {
  INTERNAL_MERGE_CASES_RESOLVE_URL,
  MERGE_CASES_API_VERSION,
  MERGE_CASES_MAX_BODY_BYTES,
} from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';

/**
 * POST /internal/cases/_merge/_resolve
 * Asks the AI to settle the fields the cases disagree on. Internal: the answers are suggestions for
 * the merge flyout.
 */
export const mergeCasesResolveRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_MERGE_CASES_RESOLVE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  version: MERGE_CASES_API_VERSION,
  params: {
    body: buildRouteValidationWithZod(MergeCasesResolveRequestSchema),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Resolve case merge conflicts with AI',
    description:
      "Asks an AI connector for a value for every field the cases hold different values for, taking the same `fields` and `attachments` as the merge preview. A field the request already sets counts as decided. The AI picks one of the cases' values, except for the title and description, which it may write. It returns the values in the shape of the merge request `fields`, with a reason for each, and leaves out any field it could not settle. It changes nothing. You must have read access to every case, an Enterprise license, and an AI connector.",
    tags: ['oas-tag:cases'],
    body: { maxBytes: MERGE_CASES_MAX_BODY_BYTES },
  },
  handler: async ({ context, request, response }) => {
    const abortController = new AbortController();
    const subscription = request.events.aborted$.subscribe(() => abortController.abort());

    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const params = request.body as MergeCasesResolveRequest;

      const res: MergeCasesResolveResponse = await casesClient.cases.mergeResolve(params, {
        abortSignal: abortController.signal,
      });

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to resolve merging cases with AI in route: ${error}`,
        error,
      });
    } finally {
      subscription.unsubscribe();
    }
  },
});
