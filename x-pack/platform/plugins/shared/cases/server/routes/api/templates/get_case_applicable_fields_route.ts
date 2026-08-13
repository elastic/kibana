/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ApplicableFieldsResponse } from '../../../../common/types/domain/template/applicable_field';
import { CASE_APPLICABLE_FIELDS_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/{case_id}/fields
 * Public route — the `extended_fields` a caller may apply to an existing case. Owner and any applied
 * template are derived from the case itself.
 */
export const getCaseApplicableFieldsRoute = createCasesRoute({
  method: 'get',
  path: CASE_APPLICABLE_FIELDS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Get the fields applicable to an existing case',
    tags: ['oas-tag:cases'],
  },
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { case_id: caseId } = request.params;

      const body: ApplicableFieldsResponse = await casesClient.cases.getApplicableFields({
        caseId,
      });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get applicable fields: ${error}`,
        error,
      });
    }
  },
});
