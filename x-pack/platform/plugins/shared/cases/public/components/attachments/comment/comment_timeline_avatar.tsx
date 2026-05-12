/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HoverableAvatarResolver } from '../../user_profiles/hoverable_avatar_resolver';
import { useCommentRenderingContext } from '../../user_actions/comment/comment_rendering_context';
import type { CaseUser } from '../../../../common/ui/types';

export interface CommentTimelineAvatarProps {
  createdBy?: CaseUser;
}

/**
 * Renders a user avatar for a comment.
 */
export const CommentTimelineAvatar: React.FC<CommentTimelineAvatarProps> = ({ createdBy }) => {
  const { userProfiles = new Map() } = useCommentRenderingContext();

  if (createdBy) {
    return <HoverableAvatarResolver user={createdBy} userProfiles={userProfiles} />;
  }

  return null;
};

CommentTimelineAvatar.displayName = 'CommentTimelineAvatar';
