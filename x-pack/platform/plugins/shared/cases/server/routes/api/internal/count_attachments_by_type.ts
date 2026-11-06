/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_ATTACHMENT_COUNTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { MAX_CASES_PER_ATTACHMENT_COUNT } from '../../../client/attachments/count_by_type';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const countAttachmentsByTypeRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_ATTACHMENT_COUNTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      case_ids: schema.arrayOf(schema.string({ minLength: 1 }), {
        maxSize: MAX_CASES_PER_ATTACHMENT_COUNT,
      }),
      type: schema.string({ minLength: 1, maxLength: 100 }),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const counts = await casesClient.attachments.countByType({
        caseIds: request.body.case_ids,
        attachmentType: request.body.type,
      });
      return response.ok({ body: { counts } });
    } catch (error) {
      throw createCaseError({
        message: `Failed to count attachments in route: ${error}`,
        error,
      });
    }
  },
});
