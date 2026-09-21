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
import {
  UnifiedAttachmentPutRequestRt,
  type UnifiedAttachmentPutRequest,
} from '../../../../common/types/api/attachment/v2';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { createIoTsRouteValidation } from '../utils';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const putAttachmentRoute = createCasesRoute<
  { case_id: string; attachment_id: string },
  unknown,
  UnifiedAttachmentPutRequest
>({
  method: 'put',
  path: CASE_ATTACHMENT_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
      attachment_id: schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
    }),
    body: createIoTsRouteValidation(UnifiedAttachmentPutRequestRt),
  },
  routerOptions: {
    // TODO(security-team#15572): flip to 'public' once this API is ready to ship.
    access: 'internal',
    summary: `Replace a case attachment`,
    tags: ['oas-tag:cases'],
    description: 'You cannot change the attachment type or the owner of an attachment.',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const caseID = request.params.case_id;
      const attachmentId = request.params.attachment_id;

      const attachment: attachmentDomainV2.UnifiedAttachment = await client.attachments.update({
        caseID,
        updateRequest: { ...request.body, id: attachmentId },
      });

      return response.ok({
        body: attachment,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to replace attachment in route case id: ${request.params.case_id} attachment id: ${request.params.attachment_id}: ${error}`,
        error,
      });
    }
  },
});
