/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ApplicableFieldsResponse } from '../../../../common/types/domain/template/applicable_field';
import {
  CASE_FIELDS_URL,
  MAX_OWNER_LENGTH,
  MAX_TEMPLATE_KEY_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/fields
 * Public route — the `extended_fields` a caller may apply when creating a case for `owner`,
 * optionally scoped to a template.
 */
export const getApplicableFieldsRoute = createCasesRoute({
  method: 'get',
  path: CASE_FIELDS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Get the fields applicable to a case',
    tags: ['oas-tag:cases'],
  },
  params: {
    query: schema.object({
      owner: schema.string({ maxLength: MAX_OWNER_LENGTH }),
      templateId: schema.maybe(schema.string({ maxLength: MAX_TEMPLATE_KEY_LENGTH })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { owner, templateId } = request.query;

      const body: ApplicableFieldsResponse = await casesClient.cases.getApplicableFields({
        owner,
        templateId,
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
