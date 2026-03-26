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
import { COMMENT, ADDED_COMMENT, DELETE_COMMENT_SUCCESS_TITLE } from './translations';
import { createCommentActionCss, hasDraftComment } from './utils';

interface UnifiedCommentViewProps extends UnifiedValueAttachmentViewProps {
  data: {
    content: string;
  };
}

const CommentAttachmentChildrenLazy = React.lazy(async () => {
  const { CommentChildren } = await import('./comment_children');

  const CommentAttachmentChildren: React.FC<UnifiedValueAttachmentViewProps> = (props) => (
    <CommentChildren
      // TODO: attachmentId here means saved object id
      // it's a legacy term that should be renamed to savedObjectId
      commentId={props.attachmentId}
      content={props.data.content as string}
      caseId={props.caseData.id}
      version={props.version}
    />
  );
  CommentAttachmentChildren.displayName = 'CommentAttachmentChildren';

  return { default: CommentAttachmentChildren };
});

const CommentTimelineAvatarLazy = React.lazy(() =>
  import('./comment_timeline_avatar').then(({ CommentTimelineAvatar }) => ({
    default: CommentTimelineAvatar,
  }))
);

const CommentActionsLazy = React.lazy(() =>
  import('./comment_actions').then(({ CommentActions }) => ({
    default: CommentActions,
  }))
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
    timelineAvatar: (
      <React.Suspense fallback={null}>
        <CommentTimelineAvatarLazy createdBy={props.createdBy} />
      </React.Suspense>
    ),
    children: CommentAttachmentChildrenLazy,
    hideDefaultActions: true,
    getActions: (viewProps: UnifiedValueAttachmentViewProps) => [
      {
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => {
          return (
            <React.Suspense fallback={null}>
              <CommentActionsLazy
                // TODO: attachmentId here meant saved object id
                // it's a legacy term that should be renamed to savedObjectId
                commentId={viewProps.attachmentId}
                content={viewProps.data.content as string}
              />
            </React.Suspense>
          );
        },
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
