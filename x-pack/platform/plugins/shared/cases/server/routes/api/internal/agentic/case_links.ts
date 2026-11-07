/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  INTERNAL_CASE_LINKS_URL,
  INTERNAL_CASE_LINK_DETAILS_URL,
} from '../../../../../common/constants';
import type { CaseLinkRequest } from '../../../../../common/types/api';
import { createCaseError } from '../../../../common/error';
import { escapeHatch } from '../../utils';
import { createCasesRoute } from '../../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';

const caseIdParams = schema.object({ case_id: schema.string({ minLength: 1, maxLength: 512 }) });

export const getRelatedCasesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_LINKS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: { params: caseIdParams },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      return response.ok({ body: await casesClient.cases.getRelatedCases(request.params.case_id) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get related cases for case ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});

export const linkCasesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_LINKS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: { params: caseIdParams, body: escapeHatch },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      return response.ok({
        body: await casesClient.cases.linkCases(
          request.params.case_id,
          request.body as CaseLinkRequest
        ),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to link cases to case ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});

export const unlinkCaseRoute = createCasesRoute({
  method: 'delete',
  path: INTERNAL_CASE_LINK_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ minLength: 1, maxLength: 512 }),
      target_case_id: schema.string({ minLength: 1, maxLength: 512 }),
    }),
  },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      return response.ok({
        body: await casesClient.cases.unlinkCase(
          request.params.case_id,
          request.params.target_case_id
        ),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to unlink case ${request.params.target_case_id} from case ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
