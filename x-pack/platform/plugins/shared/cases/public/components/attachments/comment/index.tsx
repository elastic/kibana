/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type {
  AttachmentType,
  UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { CommentChildren } from './comment_children';
import { CommentTimelineAvatar } from './comment_timeline_avatar';
import { CommentActions } from './comment_actions';
import { COMMENT, ADDED_COMMENT, DELETE_COMMENT_SUCCESS_TITLE } from './translations';
import { createCommentActionCss, hasDraftComment } from './utils';

interface UnifiedCommentViewProps extends UnifiedValueAttachmentViewProps {
  data: {
    content: string;
  };
}

const CommentAttachmentChildren = React.memo((props: UnifiedValueAttachmentViewProps) => {
  return (
    <CommentChildren
      // TODO: attachmentId here means saved object id
      // it's a legacy term that should be renamed to savedObjectId
      commentId={props.attachmentId}
      content={props.data.content as string}
      caseId={props.caseData.id}
      version={props.version}
    />
  );
});
CommentAttachmentChildren.displayName = 'CommentAttachmentChildren';

const CommentAttachmentChildrenLazy = React.lazy(() =>
  Promise.resolve({
    default: CommentAttachmentChildren,
  })
);

const getCommentClassName = (props: UnifiedCommentViewProps): string | undefined => {
  if (!props.rowContext) return undefined;

  const { attachmentId, caseData } = props;
  const { selectedOutlineCommentId, manageMarkdownEditIds, loadingCommentIds, appId } =
    props.rowContext;

  const outlined = attachmentId === selectedOutlineCommentId;
  const isEdit = manageMarkdownEditIds.includes(attachmentId);
  const isLoading = loadingCommentIds.includes(attachmentId);
  const draftFooter =
    !isEdit && !isLoading && hasDraftComment(appId, caseData.id, attachmentId, props.data.content);

  return classNames('userAction__comment', {
    outlined,
    isEdit,
    draftFooter,
  });
};

const getCommentAttachmentViewObject = (props: UnifiedValueAttachmentViewProps) => {
  const commentProps = props as UnifiedCommentViewProps;
  const className = getCommentClassName(commentProps);
  const css = createCommentActionCss(props.rowContext.euiTheme);

  return {
    event: ADDED_COMMENT,
    timelineAvatar: <CommentTimelineAvatar createdBy={props.createdBy} />,
    children: CommentAttachmentChildrenLazy,
    hideDefaultActions: true,
    getActions: (viewProps: UnifiedValueAttachmentViewProps) => [
      {
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => (
          <CommentActions
            // TODO: attachmentId here meant saved object id
            // it's a legacy term that should be renamed to savedObjectId
            commentId={viewProps.attachmentId}
            content={viewProps.data.content as string}
          />
        ),
      },
    ],
    className,
    css,
  };
};

/**
 * Returns the comment (user) attachment type for registration with the unified registry.
 * Renders comment body via CommentChildren and uses CommentTimelineAvatar.
 */
export const getCommentAttachmentType = (): AttachmentType<UnifiedValueAttachmentViewProps> => ({
  id: COMMENT_ATTACHMENT_TYPE,
  icon: 'editorComment',
  displayName: COMMENT,
  getAttachmentViewObject: (props) => getCommentAttachmentViewObject(props),
  getAttachmentRemovalObject: () => ({ event: DELETE_COMMENT_SUCCESS_TITLE }),
});
