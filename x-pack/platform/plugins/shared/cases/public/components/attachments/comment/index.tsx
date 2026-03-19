/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { COMMENT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import type {
  AttachmentType,
  UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { COMMENT, ADDED_COMMENT, DELETE_COMMENT_SUCCESS_TITLE } from './translations';

const CommentTimelineAvatarLazy = React.lazy(() =>
  import('./comment_timeline_avatar').then(({ CommentTimelineAvatar }) => ({
    default: CommentTimelineAvatar,
  }))
);

const getCommentAttachmentViewObject = (props: UnifiedValueAttachmentViewProps) => ({
  event: ADDED_COMMENT,
  timelineAvatar: (
    <React.Suspense fallback={null}>
      <CommentTimelineAvatarLazy createdBy={props.createdBy} />
    </React.Suspense>
  ),
  hideDefaultActions: true,
});

/**
 * Returns the comment (user) attachment type for registration with the unified registry.
 * Comment rendering (CommentChildren, Edit/Quote actions, className, css) is handled by
 * the registered attachment builder as default behavior.
 */
export const getCommentAttachmentType = (): AttachmentType<UnifiedValueAttachmentViewProps> => ({
  id: COMMENT_ATTACHMENT_TYPE,
  icon: 'editorComment',
  displayName: COMMENT,
  getAttachmentViewObject: (props) => getCommentAttachmentViewObject(props),
  getAttachmentRemovalObject: () => ({ event: DELETE_COMMENT_SUCCESS_TITLE }),
});
