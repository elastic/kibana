/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UserActions } from '../../../../common/types/domain';
import { isCommentUserAction } from '../../../../common/utils/user_actions';
import { toUnifiedAttachmentPayload } from '../../../common/attachments';

/**
 * Converts legacy-shaped comment user actions to the unified shape the UI renders.
 * Public routes keep the legacy shape.
 */
export const projectCommentUserActionsToUnified = (
  userActions: UserActions,
  logger: Logger
): UserActions =>
  userActions.map((userAction) => {
    if (!isCommentUserAction(userAction)) {
      return userAction;
    }

    try {
      return {
        ...userAction,
        payload: {
          ...userAction.payload,
          comment: toUnifiedAttachmentPayload(userAction.payload.comment),
        },
      };
    } catch (error) {
      // A malformed historical payload must not fail the whole response.
      logger.warn(
        `Failed to project user action ${userAction.id} comment payload to unified: ${error}`
      );
      return userAction;
    }
  });
