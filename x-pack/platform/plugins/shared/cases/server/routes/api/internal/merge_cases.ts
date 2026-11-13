/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MergeCasesPreviewRequest,
  MergeCasesPreviewResponse,
  MergeCasesRequest,
  MergeCasesResponse,
} from '../../../../common/types/api';
import {
  INTERNAL_MERGE_CASES_PREVIEW_URL,
  INTERNAL_MERGE_CASES_URL,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const mergeCasesPreviewRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_MERGE_CASES_PREVIEW_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: escapeHatch,
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    const params = request.body as MergeCasesPreviewRequest;

    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      const res: MergeCasesPreviewResponse = await casesClient.cases.mergePreview(params);

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to preview merging cases in route: ${error}`,
        error,
      });
    }
  },
});

export const mergeCasesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_MERGE_CASES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: escapeHatch,
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    const params = request.body as MergeCasesRequest;

    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

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
