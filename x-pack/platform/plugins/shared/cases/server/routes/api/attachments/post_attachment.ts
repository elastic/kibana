/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_ATTACHMENTS_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import type { attachmentDomainV2 } from '../../../../common/types/domain';
import {
  UnifiedAttachmentPayloadRt,
  type UnifiedAttachmentPayload,
} from '../../../../common/types/domain/attachment/v2';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { createIoTsBodyValidation } from '../utils';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * Creates a single attachment from a unified payload — no legacy shapes accepted.
 */
export const postAttachmentRoute = createCasesRoute<
  { case_id: string },
  unknown,
  UnifiedAttachmentPayload
>({
  method: 'post',
  path: CASE_ATTACHMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_CASE_ID_LENGTH }),
    }),
    body: createIoTsBodyValidation(UnifiedAttachmentPayloadRt),
  },
  routerOptions: {
    // TODO(security-team#15572): flip to 'public' once this API is ready to ship.
    access: 'internal',
    summary: `Create a case attachment`,
    tags: ['oas-tag:cases'],
    description: 'Creates a single unified attachment (e.g. a comment or an alert).',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const attachment: attachmentDomainV2.UnifiedAttachment = await client.attachments.add({
        caseId: request.params.case_id,
        comment: request.body,
      });

      return response.created({
        body: attachment,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create attachment in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
