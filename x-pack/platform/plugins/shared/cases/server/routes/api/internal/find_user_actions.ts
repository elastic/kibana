/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { schema } from '@kbn/config-schema';

import { isCommentUserAction } from '../../../../common/utils/user_actions';
import type { attachmentApiV2, userActionApiV1 } from '../../../../common/types/api';
import type { AttachmentRequestV2 } from '../../../../common/types/api';
import { UserActionInternalFindRequestRt } from '../../../../common/types/api';
import { INTERNAL_CASE_FIND_USER_ACTIONS_URL } from '../../../../common/constants';
import { toUnifiedAttachmentPayload } from '../../../common/attachments';
import { createCaseError } from '../../../common/error';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const findUserActionsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_FIND_USER_ACTIONS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response, logger }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const query = request.query as Record<string, unknown>;
      const { types, authors, sources, ...restQuery } = query;
      const options = decodeWithExcessOrThrow(UserActionInternalFindRequestRt)({
        ...restQuery,
        ...(types != null ? { types: castArray(types) } : {}),
        ...(authors != null ? { authors: castArray(authors) } : {}),
        ...(sources != null ? { sources: castArray(sources) } : {}),
      });

      const userActionsResponse: userActionApiV1.UserActionFindResponse =
        await casesClient.userActions.find({
          caseId,
          params: options,
        });

      // User actions persist the legacy attachment shape (see the comment user
      // action builder). Project comment payloads to unified here so the
      // internal read path matches how live attachments are returned. The public
      // route intentionally keeps the legacy shape until it is deprecated.
      const userActions = userActionsResponse.userActions.map((userAction) => {
        if (!isCommentUserAction(userAction)) {
          return userAction;
        }

        try {
          return {
            ...userAction,
            payload: {
              ...userAction.payload,
              comment: toUnifiedAttachmentPayload(userAction.payload.comment as AttachmentRequestV2),
            },
          };
        } catch (error) {
          // A malformed historical payload must not fail the whole activity feed;
          // keep the original legacy payload for this row.
          logger.warn(
            `Failed to project user action ${userAction.id} comment payload to unified: ${error}`
          );
          return userAction;
        }
      });

      const uniqueCommentIds: Set<string> = new Set();
      for (const action of userActions) {
        if (isCommentUserAction(action) && action.comment_id) {
          uniqueCommentIds.add(action.comment_id);
        }
      }
      const commentIds = Array.from(uniqueCommentIds);

      let attachmentRes: attachmentApiV2.BulkGetUnifiedAttachmentsResponse = {
        attachments: [],
        errors: [],
      };

      if (commentIds.length > 0) {
        attachmentRes = await casesClient.attachments.bulkGet({
          caseID: caseId,
          savedObjectIds: commentIds,
        });
      }

      const res: userActionApiV1.UserActionInternalFindResponse = {
        ...userActionsResponse,
        userActions,
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
