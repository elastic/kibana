/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { UnifiedValueAttachmentType } from '../../../client/attachment_framework/types';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import { CommentAttachmentTimelineAvatar } from './comment_attachment_children';

const CommentAttachmentChildrenLazy = React.lazy(() =>
  import('./comment_attachment_children').then((module) => ({
    default: module.CommentAttachmentChildren,
  }))
);

/**
 * Gets the comment attachment type definition for registration with the unified registry.
 * This registers the 'comment' type (canonical name for 'user').
 * The registry always uses the canonical name 'comment', but when creating attachments,
 * the feature flag-aware type name should be used.
 */
export const getCommentAttachmentType = (): UnifiedValueAttachmentType => ({
  id: 'comment', // Always use canonical name in registry
  icon: 'editorComment',
  displayName: 'Comment',
  getAttachmentViewObject: (props) => {
    const CommentAttachmentActionsLazy = React.lazy(() =>
      import('./comment_attachment_children').then((module) => ({
        default: module.CommentAttachmentActions,
      }))
    );

    return {
      event: '',
      timelineAvatar: <CommentAttachmentTimelineAvatar {...props} />,
      children: CommentAttachmentChildrenLazy,
      getActions: () => [
        {
          type: AttachmentActionType.CUSTOM,
          render: () => <CommentAttachmentActionsLazy {...props} />,
        },
      ],
    };
  },
});
