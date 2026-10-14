/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import {
  CommentAttachmentPayloadSchema,
  type CommentAttachmentData,
} from '../../../../common/types/domain_zod/attachment/comment/v2';
import {
  AttachmentActionType,
  defineAttachment,
  type UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { COMMENT, ADDED_COMMENT, REMOVED_COMMENT_LABEL_TITLE } from './translations';
import { createCommentActionCss, hasDraftComment } from './utils';

type CommentViewProps = UnifiedValueAttachmentViewProps<CommentAttachmentData>;

const CommentAttachmentChildrenLazy = React.lazy(async () => {
  const { CommentChildren } = await import('./comment_children');

  const CommentAttachmentChildren: React.FC<CommentViewProps> = (props) => (
    <CommentChildren
      commentId={props.savedObjectId}
      content={props.data.content}
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

const CommentTimelineAvatarIcon: React.FC<Pick<CommentViewProps, 'createdBy'>> = ({
  createdBy,
}) => (
  <React.Suspense fallback={null}>
    <CommentTimelineAvatarLazy createdBy={createdBy} />
  </React.Suspense>
);
CommentTimelineAvatarIcon.displayName = 'CommentTimelineAvatarIcon';

const CommentActionsLazy = React.lazy(() =>
  import('./comment_actions').then(({ CommentActions }) => ({
    default: CommentActions,
  }))
);

const getCommentClassName = (props: CommentViewProps): string | undefined => {
  if (!props.rowContext) return undefined;

  const { savedObjectId, caseData } = props;
  const { selectedOutlineCommentId, manageMarkdownEditIds, loadingCommentIds, appId } =
    props.rowContext;

  const outlined = savedObjectId === selectedOutlineCommentId;
  const isEdit = manageMarkdownEditIds.includes(savedObjectId);
  const isLoading = loadingCommentIds.includes(savedObjectId);
  const draftFooter =
    !isEdit && !isLoading && hasDraftComment(appId, caseData.id, savedObjectId, props.data.content);

  return classNames('userAction__comment', {
    outlined,
    isEdit,
    draftFooter,
  });
};

const getCommentCreationActivity = (props: CommentViewProps) => {
  const className = getCommentClassName(props);
  const css = createCommentActionCss(props.rowContext.euiTheme);

  return {
    event: ADDED_COMMENT,
    children: CommentAttachmentChildrenLazy,
    hideDefaultActions: true,
    getActions: (viewProps: CommentViewProps) => [
      {
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => {
          return (
            <React.Suspense fallback={null}>
              <CommentActionsLazy
                commentId={viewProps.savedObjectId}
                content={viewProps.data.content}
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
export const getCommentAttachmentType = () =>
  defineAttachment({
    id: COMMENT_ATTACHMENT_TYPE,
    getIcon: (props) => <CommentTimelineAvatarIcon createdBy={props.createdBy} />,
    getLabel: () => COMMENT,
    getCreationActivity: getCommentCreationActivity,
    getRemovalActivity: () => ({ event: REMOVED_COMMENT_LABEL_TITLE }),
    schema: CommentAttachmentPayloadSchema,
  });
