/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CASE_ATTACHMENT_DETAILS_URL,
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_CASE_ID_LENGTH,
} from '../../../../common/constants';
import type { attachmentDomainV2 } from '../../../../common/types/domain';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getAttachmentRoute = createCasesRoute({
  method: 'get',
  path: CASE_ATTACHMENT_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
      id: schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
    }),
  },
  routerOptions: {
    // TODO(security-team#15572): flip to 'public' once this API is ready to ship.
    access: 'internal',
    summary: `Get a case attachment`,
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const res: attachmentDomainV2.UnifiedAttachment = await client.attachments.get({
        savedObjectId: request.params.id,
        caseID: request.params.case_id,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get attachment in route case id: ${request.params.case_id} id: ${request.params.id}: ${error}`,
        error,
      });
    }
  },
});
