/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_ATTACHMENTS_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * Deletes every attachment from a case.
 */
export const deleteAllAttachmentsRoute = createCasesRoute({
  method: 'delete',
  path: CASE_ATTACHMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
  },
  routerOptions: {
    // TODO(security-team#15572): flip to 'public' once this API is ready to ship.
    access: 'internal',
    summary: `Delete all case attachments`,
    tags: ['oas-tag:cases'],
    description: 'Deletes all attachments from a case.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      await client.attachments.deleteAll({
        caseID: request.params.case_id,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete all attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
