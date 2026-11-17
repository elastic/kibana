/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MergeCasesPreviewRequest,
  MergeCasesPreviewResponse,
} from '../../../../../common/types/api';
import { INTERNAL_MERGE_CASES_PREVIEW_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';

/**
 * POST /internal/cases/_merge/_preview
 * Shaped like the public Cases routes so it can move to `/api/cases/_merge/_preview` as is.
 */
export const mergeCasesPreviewRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_MERGE_CASES_PREVIEW_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Preview a case merge',
    description:
      'Shows what merging the cases would do, without changing anything: the suggested title, description, severity, category, tags, and assignees, how many alerts, events, observables, and other attachments would be copied, and whether a per-case limit would be exceeded. When a limit is exceeded, the response lists every attachment the merge would copy, with the keys to pass in `excludedAttachments` to leave some out. You must have read access to every case.',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const params = request.body as MergeCasesPreviewRequest;

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
