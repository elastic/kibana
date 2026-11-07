/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { CASE_LINK_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import { CaseLinkAttachmentPayloadSchema } from '../../../common/types/domain/attachment/case_link/v1';
import type { CasesClient } from '../../client';
import { caseNotFoundMessage } from '../../client/cases/links';
import type { UnifiedAttachmentTypeSetup } from '../types';

/**
 * A link from one case to another. `resolve` reads the other case as the requester, so nobody can
 * link a case they can't see, whichever path writes the attachment.
 */
export const createCaseLinkAttachmentType = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
): UnifiedAttachmentTypeSetup => ({
  id: CASE_LINK_ATTACHMENT_TYPE,
  schema: CaseLinkAttachmentPayloadSchema,
  workflowSchema: false,
  resolve: async (payload, { request }) => {
    const parsed = CaseLinkAttachmentPayloadSchema.parse(payload);
    const casesClient = await getCasesClient(request);
    const { cases } = await casesClient.cases.bulkGet({ ids: [parsed.attachmentId] });
    const target = cases[0];
    if (!target) {
      throw Boom.badRequest(caseNotFoundMessage(parsed.attachmentId));
    }
    // The title and number are never stored: see CaseLinkAttachmentMetadataSchema.
    return { ...payload, metadata: {} };
  },
});
