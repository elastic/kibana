/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  INTERNAL_BULK_DELETE_ATTACHMENTS_URL,
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_CASE_ID_LENGTH,
} from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkDeleteAttachmentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_DELETE_ATTACHMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: schema.object({
      ids: schema.arrayOf(schema.string({ minLength: 1, maxLength: MAX_ATTACHMENT_ID_LENGTH }), {
        minSize: 1,
        maxSize: MAX_BULK_DELETE_ATTACHMENTS,
      }),
      include_related: schema.maybe(schema.boolean()),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      await client.attachments.bulkDelete({
        caseId: request.params.case_id,
        attachmentIds: request.body.ids,
        includeRelated: request.body.include_related,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk delete attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
