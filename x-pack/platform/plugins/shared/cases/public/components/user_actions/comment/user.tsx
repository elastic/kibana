/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

import type { UserCommentAttachment } from '../../../../common/types/domain';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { UserActionBuilderArgs, UserActionBuilder } from '../types';
import { HoverableUsernameResolver } from '../../user_profiles/hoverable_username_resolver';
import { CommentChildren } from '../../attachments/comment/comment_children';
import { CommentActions } from '../../attachments/comment/comment_actions';
import { CommentTimelineAvatar } from '../../attachments/comment/comment_timeline_avatar';
import { hasDraftComment } from '../../attachments/comment/utils';

type BuilderArgs = Pick<UserActionBuilderArgs, 'userProfiles' | 'appId' | 'euiTheme'> & {
  attachment: SnakeToCamelCase<UserCommentAttachment>;
  caseId: string;
  outlined: boolean;
  isEdit: boolean;
  isLoading: boolean;
};

const createCommentActionCss = (euiTheme?: EuiThemeComputed<{}>) => {
  if (!euiTheme) {
    return css``;
  }

  return css`
    [class*='euiTimelineItemEvent'] {
      max-width: calc(100% - (${euiTheme.size.xl} + ${euiTheme.size.base}));
    }
  `;
};

export const createUserAttachmentUserActionBuilder = ({
  appId,
  attachment,
  userProfiles,
  outlined,
  isEdit,
  isLoading,
  caseId,
  euiTheme,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => [
    {
      username: (
        <HoverableUsernameResolver user={attachment.createdBy} userProfiles={userProfiles} />
      ),
      'data-test-subj': `comment-create-action-${attachment.id}`,
      timestamp: (
        <UserActionTimestamp createdAt={attachment.createdAt} updatedAt={attachment.updatedAt} />
      ),
      className: classNames('userAction__comment', {
        outlined,
        isEdit,
        draftFooter:
          !isEdit &&
          !isLoading &&
          hasDraftComment(appId, caseId, attachment.id, attachment.comment),
      }),
      css: createCommentActionCss(euiTheme),
      children: (
        <CommentChildren
          commentId={attachment.id}
          content={attachment.comment}
          caseId={caseId}
          version={attachment.version}
        />
      ),
      timelineAvatar: <CommentTimelineAvatar createdBy={attachment.createdBy} />,
      actions: <CommentActions commentId={attachment.id} content={attachment.comment} />,
    },
  ],
});
