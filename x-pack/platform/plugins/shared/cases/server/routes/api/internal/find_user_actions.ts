/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isCommentUserAction } from '../../../../common/utils/user_actions';
import type { attachmentApiV1, userActionApiV1 } from '../../../../common/types/api';
import { INTERNAL_CASE_FIND_USER_ACTIONS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const findUserActionsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_FIND_USER_ACTIONS_URL,
  params,
  routerOptions: {
    access: 'public',
    summary: 'Get user actions by case',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const options = request.query as userActionApiV1.UserActionFindRequest;

      const userActionsResponse: userActionApiV1.UserActionFindResponse =
        await casesClient.userActions.find({
          caseId,
          params: options,
        });

      const uniqueCommentIds: Set<string> = new Set();
      for (const action of userActionsResponse.userActions) {
        if (isCommentUserAction(action) && action.comment_id) {
          uniqueCommentIds.add(action.comment_id);
        }
      }
      const commentIds = Array.from(uniqueCommentIds);

      let attachmentRes: attachmentApiV1.BulkGetAttachmentsResponse = {
        attachments: [],
        errors: [],
      };

      if (commentIds.length > 0) {
        attachmentRes = await casesClient.attachments.bulkGet({
          caseID: caseId,
          attachmentIDs: commentIds,
        });
      }

      const res: userActionApiV1.UserActionInternalFindResponse = {
        ...userActionsResponse,
        latestAttachments: attachmentRes.attachments,
      };

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case details in route case id: ${request.params.case_id}: \n${error}`,
        error,
      });
    }
  },
});
