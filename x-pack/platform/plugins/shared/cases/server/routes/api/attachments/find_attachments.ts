/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_ATTACHMENTS_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import {
  UnifiedAttachmentsFindQueryParamsRt,
  type UnifiedAttachmentsFindQueryParams,
  type UnifiedAttachmentsFindResponse,
} from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { createIoTsRouteValidation } from '../utils';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

// Authorization filters the query rather than checking each result, so a user with
// valid Cases access but the wrong owner gets an empty list, not a 403 (unlike the
// single-entity `GET /attachments/{id}`, which checks the one entity directly).
export const findAttachmentsRoute = createCasesRoute<
  { case_id: string },
  UnifiedAttachmentsFindQueryParams,
  unknown
>({
  method: 'get',
  path: CASE_ATTACHMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    query: createIoTsRouteValidation(UnifiedAttachmentsFindQueryParamsRt),
  },
  routerOptions: {
    // TODO(security-team#15572): flip to 'public' once this API is ready to ship.
    access: 'internal',
    summary: `Find case attachments`,
    tags: ['oas-tag:cases'],
    description: 'Retrieves a paginated, optionally type-filtered list of attachments for a case.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const res: UnifiedAttachmentsFindResponse = await client.attachments.find({
        caseID: request.params.case_id,
        findQueryParams: request.query,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
