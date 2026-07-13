/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_BULK_CREATE_ATTACHMENTS_URL } from '../../../../common/constants';
import { isUnifiedOnlyAttachment } from '../../../services/type_guards';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';
import type { attachmentApiV2 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const bulkCreateAttachmentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.arrayOf(escapeHatch),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const caseId = request.params.case_id;
      const attachments = request.body as attachmentApiV2.BulkCreateAttachmentsRequestV2;
      // Encode the response in `unified` mode when the batch contains an
      // attachment with no V1 form to downgrade to: a unified-only type
      // (dashboard, map, discoverSession) or an SO-reference instance of a
      // hybrid type (e.g. Lens-by-reference). Everything else stays legacy-shaped
      // so existing public consumers of this route are unaffected.
      const hasUnifiedOnlyAttachment = attachments.some((attachment) =>
        isUnifiedOnlyAttachment(attachment)
      );
      const res: caseDomainV1.Case = await casesClient.attachments.bulkCreate({
        caseId,
        attachments,
        mode: hasUnifiedOnlyAttachment ? 'unified' : 'legacy',
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk create attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
