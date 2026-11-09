/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { userActionApiV1 } from '../../../../common/types/api';
import {
  INTERNAL_GET_ATTACHMENT_HISTORY_URL,
  MAX_ATTACHMENT_ID_LENGTH,
} from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { projectCommentUserActionsToUnified } from './project_user_actions';

export const getAttachmentHistoryRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_GET_ATTACHMENT_HISTORY_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      case_id: schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
      attachment_id: schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH }),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response, logger }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const { case_id: caseId, attachment_id: attachmentId } = request.params;

      const { userActions } = await casesClient.userActions.getAttachmentHistory({
        caseId,
        attachmentId,
      });

      const res: userActionApiV1.AttachmentHistoryResponse = {
        userActions: projectCommentUserActionsToUnified(userActions, logger),
      };

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve attachment history in route case id: ${request.params.case_id} attachment id: ${request.params.attachment_id}: ${error}`,
        error,
      });
    }
  },
});
