/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';

import type { ActionsAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../../user_actions/types';
import { UserActionTimestamp } from '../../user_actions/timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionCopyLink } from '../../user_actions/copy_link';
import { ScrollableMarkdown } from '../../markdown_editor';
import { HostIsolationCommentEvent } from './host_isolation_event';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'actionsNavigation' | 'userProfiles'
> & {
  attachment: SnakeToCamelCase<ActionsAttachment>;
};

export const createActionAttachmentUserActionBuilder = ({
  userAction,
  userProfiles,
  attachment,
  actionsNavigation,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => {
    const actionIconName = attachment.actions.type === 'isolate' ? 'lock' : 'lockOpen';
    return [
      {
        username: (
          <HoverableUserWithAvatarResolver
            user={attachment.createdBy}
            userProfiles={userProfiles}
          />
        ),
        className: classNames('comment-action', {
          'empty-comment': attachment.comment.trim().length === 0,
        }),
        event: (
          <HostIsolationCommentEvent
            type={attachment.actions.type}
            endpoints={attachment.actions.targets}
            href={actionsNavigation?.href}
            onClick={actionsNavigation?.onClick}
          />
        ),
        'data-test-subj': 'endpoint-action',
        timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
        timelineAvatar: actionIconName,
        timelineAvatarAriaLabel: actionIconName,
        actions: <UserActionCopyLink id={attachment.id} />,
        children: attachment.comment.trim().length > 0 && (
          <ScrollableMarkdown content={attachment.comment} />
        ),
      },
    ];
  },
});
