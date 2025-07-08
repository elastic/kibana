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
import { AssistantAvatar } from '@kbn/ai-assistant-icon';

import type { AssistantCommentAttachment } from '../../../../common/types/domain';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionMarkdown } from '../markdown_form';
import { UserActionContentToolbar } from '../content_toolbar';
import type { UserActionBuilderArgs, UserActionBuilder } from '../types';
import { UserCommentPropertyActions } from '../property_actions/user_comment_property_actions';
import { HoverableAssistantResolver } from '../../user_profiles/hoverable_assistant_resolver';
import * as i18n from './translations';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'handleManageQuote' | 'commentRefs' | 'handleDeleteComment' | 'euiTheme'
> & {
  attachment: SnakeToCamelCase<AssistantCommentAttachment>;
  caseId: string;
  outlined: boolean;
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

export const createAssistantAttachmentUserActionBuilder = ({
  attachment,
  outlined,
  isLoading,
  commentRefs,
  caseId,
  euiTheme,
  handleManageQuote,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => [
    {
      username: <HoverableAssistantResolver />,
      'data-test-subj': `assistant-comment-create-action-${attachment.id}`,
      timestamp: (
        <UserActionTimestamp createdAt={attachment.createdAt} updatedAt={attachment.updatedAt} />
      ),
      className: classNames('userAction__comment', { outlined, draftFooter: false }),
      css: createCommentActionCss(euiTheme),
      children: (
        <>
          <UserActionMarkdown
            key={attachment.id}
            ref={(element) => (commentRefs.current[attachment.id] = element)}
            id={attachment.id}
            content={attachment.comment}
            isEditable={false}
            caseId={caseId}
          />
        </>
      ),
      timelineAvatar: <AssistantAvatar name="machine" size="m" color="subdued" />,
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <UserCommentPropertyActions
            isLoading={isLoading}
            commentContent={attachment.comment}
            onDelete={() => handleDeleteComment(attachment.id, i18n.DELETE_COMMENT_SUCCESS_TITLE)}
            onQuote={() => handleManageQuote(attachment.comment)}
          />
        </UserActionContentToolbar>
      ),
    },
  ],
});
