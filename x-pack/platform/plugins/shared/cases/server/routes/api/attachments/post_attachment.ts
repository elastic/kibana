/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsUtils } from '@kbn/core/server';
import { CASE_ATTACHMENTS_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import type { attachmentDomainV2 } from '../../../../common/types/domain';
import {
  UnifiedAttachmentPayloadRt,
  type UnifiedAttachmentPayload,
} from '../../../../common/types/domain/attachment/v2';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { createIoTsRouteValidation } from '../utils';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { pickCreatedOrExistingAttachment } from '../../../client/attachments/add';
import { toUnifiedAttachment } from '../../../services/attachments/operations/utils';

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
    body: createIoTsRouteValidation(UnifiedAttachmentPayloadRt),
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
      const caseId = request.params.case_id;

      // Pre-generate the id so we can locate the created attachment in the
      // returned case. TODO: return the attachment directly once the client no
      // longer encodes the full case (security-team#15572 follow-up).
      const id = SavedObjectsUtils.generateId();
      const updatedCase = await client.attachments.add({
        caseId,
        comment: request.body,
        id,
      });

      const created = pickCreatedOrExistingAttachment(updatedCase.comments, id, request.body);
      if (created == null) {
        throw new Error(`Failed to locate created attachment ${id} on case ${caseId}`);
      }

      const attachment: attachmentDomainV2.UnifiedAttachment = toUnifiedAttachment(created);

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
