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
import { EuiText } from '@elastic/eui';

import { AssistantAvatar } from '@kbn/ai-assistant-icon';
import type { UserCommentAttachment } from '../../../../common/types/domain';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionMarkdown } from '../markdown_form';
import { UserActionContentToolbar } from '../content_toolbar';
import type { UserActionBuilderArgs, UserActionBuilder } from '../types';
import { HoverableUsernameResolver } from '../../user_profiles/hoverable_username_resolver';
import { HoverableAvatarResolver } from '../../user_profiles/hoverable_avatar_resolver';
import { UserCommentPropertyActions } from '../property_actions/user_comment_property_actions';
import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';
import { HoverableAssistantTitle } from '../../assistant';
import * as i18n from './translations';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'handleManageMarkdownEditId'
  | 'handleSaveComment'
  | 'handleManageQuote'
  | 'commentRefs'
  | 'handleDeleteComment'
  | 'userProfiles'
  | 'appId'
  | 'euiTheme'
> & {
  attachment: SnakeToCamelCase<UserCommentAttachment>;
  caseId: string;
  outlined: boolean;
  isEdit: boolean;
  isLoading: boolean;
  isGeneratedByAssistant: boolean;
};

const getCommentFooterCss = (euiTheme?: EuiThemeComputed<{}>) => {
  if (!euiTheme) {
    return css``;
  }
  return css`
    border-top: ${euiTheme.border.thin};
    padding: ${euiTheme.size.s};
  `;
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

const hasDraftComment = (
  applicationId = '',
  caseId: string,
  commentId: string,
  comment: string
): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });

  const sessionValue = sessionStorage.getItem(draftStorageKey);

  return Boolean(sessionValue && sessionValue !== comment);
};

export const createUserAttachmentUserActionBuilder = ({
  appId,
  attachment,
  userProfiles,
  outlined,
  isEdit,
  isLoading,
  isGeneratedByAssistant,
  commentRefs,
  caseId,
  euiTheme,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => [
    {
      username: isGeneratedByAssistant ? (
        <HoverableAssistantTitle />
      ) : (
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
        <>
          <UserActionMarkdown
            key={isEdit ? attachment.id : undefined}
            ref={(element) => (commentRefs.current[attachment.id] = element)}
            id={attachment.id}
            content={attachment.comment}
            isEditable={isEdit}
            caseId={caseId}
            onChangeEditable={handleManageMarkdownEditId}
            onSaveContent={handleSaveComment.bind(null, {
              id: attachment.id,
              version: attachment.version,
            })}
          />
          {!isEdit &&
          !isLoading &&
          hasDraftComment(appId, caseId, attachment.id, attachment.comment) ? (
            <EuiText css={getCommentFooterCss(euiTheme)}>
              <EuiText color="subdued" size="xs" data-test-subj="user-action-comment-unsaved-draft">
                {i18n.UNSAVED_DRAFT_COMMENT}
              </EuiText>
            </EuiText>
          ) : (
            ''
          )}
        </>
      ),
      timelineAvatar: isGeneratedByAssistant ? (
        <AssistantAvatar
          name={'machine'}
          size={'m'}
          color={'subdued'}
          data-test-subj={'assistant-avatar'}
        />
      ) : (
        <HoverableAvatarResolver user={attachment.createdBy} userProfiles={userProfiles} />
      ),
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <UserCommentPropertyActions
            isLoading={isLoading}
            commentContent={attachment.comment}
            onEdit={() => handleManageMarkdownEditId(attachment.id)}
            onDelete={() => handleDeleteComment(attachment.id, i18n.DELETE_COMMENT_SUCCESS_TITLE)}
            onQuote={() => handleManageQuote(attachment.comment)}
          />
        </UserActionContentToolbar>
      ),
    },
  ],
});
